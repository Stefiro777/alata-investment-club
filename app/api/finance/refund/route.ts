import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requirePrivilegedAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { PAYMENT_TX_COLUMNS, REFUNDABLE_SOURCES, recordRefund, type PaymentTransaction } from '@/lib/refunds'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/**
 * Full refund (gross) of a Stripe payment recorded in `transactions`.
 * Only bod/director/superadmin (requirePrivilegedAccess). Event tickets,
 * merch and career bookings only: membership payments are not refundable
 * from here.
 */
export async function POST(req: NextRequest) {
  const member = await requirePrivilegedAccess()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let transactionId: unknown
  let confirm: unknown
  try {
    const body = await req.json()
    transactionId = body?.transactionId
    confirm = body?.confirm
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof transactionId !== 'string' || !transactionId) {
    return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 })
  }
  // Explicit confirmation is part of the contract: the UI sends it only after
  // the operator confirmed the amount.
  if (confirm !== true) {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: tx } = await supabase
    .from('transactions')
    .select(`type, ${PAYMENT_TX_COLUMNS}`)
    .eq('id', transactionId)
    .maybeSingle()
  if (!tx) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
  const payment = tx as unknown as PaymentTransaction & { type: string }

  if (payment.type !== 'revenue' || !payment.stripe_payment_intent_id) {
    return NextResponse.json({ error: 'Not a Stripe payment' }, { status: 400 })
  }
  if (payment.source_type === 'membership') {
    return NextResponse.json({ error: 'Membership payments cannot be refunded from here' }, { status: 400 })
  }
  if (!payment.source_type || !REFUNDABLE_SOURCES.includes(payment.source_type)) {
    return NextResponse.json({ error: 'This transaction is not refundable' }, { status: 400 })
  }

  const { count: existing } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('refund_of', payment.id)
  if ((existing ?? 0) > 0) {
    return NextResponse.json({ error: 'Already refunded' }, { status: 409 })
  }

  let refund: Stripe.Refund
  try {
    // The idempotency key makes a double click / retry return the same refund.
    refund = await stripe.refunds.create(
      { payment_intent: payment.stripe_payment_intent_id, reason: 'requested_by_customer' },
      { idempotencyKey: `refund-tx-${payment.id}` },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[finance/refund] Stripe refund failed:', message)
    return NextResponse.json({ error: `Stripe: ${message}` }, { status: 502 })
  }

  try {
    await recordRefund(supabase, { tx: payment, refund, fullyRefunded: true })
  } catch (err) {
    // The money has been refunded on Stripe: surface the problem loudly.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[finance/refund] refunded on Stripe but bookkeeping failed:', refund.id, message)
    return NextResponse.json(
      { error: `Rimborso eseguito su Stripe (${refund.id}) ma registrazione fallita: ${message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true, refundId: refund.id, amount: refund.amount / 100 })
}
