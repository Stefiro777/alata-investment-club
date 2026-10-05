import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export type TransactionSource = 'membership' | 'event' | 'merch' | 'career'

export type StripeBreakdown = {
  paymentIntentId: string | null
  /** What the customer paid (EUR). */
  gross: number
  /** Stripe fee (EUR); null when it could not be determined. */
  fee: number | null
  /** What the club receives: gross - fee (equals gross when the fee is unknown). */
  net: number
}

/**
 * Gross / fee / net of a payment, from the charge's balance transaction.
 * `paymentIntent` is the id (or object) of the PaymentIntent behind a Checkout
 * Session or a direct payment; `fallbackGrossCents` is used for free orders
 * (no PaymentIntent) and when Stripe cannot be queried.
 */
export async function getStripeBreakdown(
  stripe: Stripe,
  paymentIntent: string | Stripe.PaymentIntent | null | undefined,
  fallbackGrossCents: number,
): Promise<StripeBreakdown> {
  const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id ?? null
  const fallbackGross = fallbackGrossCents / 100

  if (!paymentIntentId) {
    // Free order (or no payment): nothing was charged, so there is no fee.
    return { paymentIntentId: null, gross: fallbackGross, fee: fallbackGross === 0 ? 0 : null, net: fallbackGross }
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction'],
    })
    const charge = pi.latest_charge as Stripe.Charge | null
    const bt = charge && typeof charge !== 'string' ? (charge.balance_transaction as Stripe.BalanceTransaction | string | null) : null
    if (bt && typeof bt !== 'string') {
      return {
        paymentIntentId,
        gross: pi.amount / 100,
        fee: bt.fee / 100,
        net: bt.net / 100,
      }
    }
    return { paymentIntentId, gross: pi.amount / 100, fee: null, net: pi.amount / 100 }
  } catch (err) {
    console.error('[stripe-finance] could not read balance transaction for', paymentIntentId, err)
    return { paymentIntentId, gross: fallbackGross, fee: null, net: fallbackGross }
  }
}

async function categoryId(supabase: SupabaseClient, name: string): Promise<string | null> {
  const { data: cat } = await supabase.from('budget_categories').select('id').eq('name', name).maybeSingle()
  if (cat) return cat.id
  const { data: created } = await supabase
    .from('budget_categories')
    .insert({ name, type: 'revenue' })
    .select('id')
    .single()
  return created?.id ?? null
}

/**
 * Inserts the revenue row for a Stripe payment: amount = NET, with gross, fee
 * and Stripe ids stored in their own columns. Idempotent per PaymentIntent
 * (unique index): a retried webhook, or a second handler seeing the same
 * payment, is a no-op. Returns true when a row was inserted.
 */
export async function recordStripeRevenue(
  supabase: SupabaseClient,
  params: {
    categoryName: string
    source: TransactionSource
    description: string
    breakdown: StripeBreakdown
    sessionId?: string | null
    note?: string
  },
): Promise<boolean> {
  const { breakdown: b } = params
  const feeLabel = b.fee === null ? 'n/d' : `€${b.fee.toFixed(2)}`
  const note = [
    params.note,
    `Lordo: €${b.gross.toFixed(2)} | Commissioni Stripe: ${feeLabel} | Netto: €${b.net.toFixed(2)}`,
    b.paymentIntentId,
    params.sessionId,
  ].filter(Boolean).join(' | ')

  const { error } = await supabase.from('transactions').insert({
    type: 'revenue',
    date: new Date().toISOString().slice(0, 10),
    amount: b.net,
    gross_amount: b.gross,
    stripe_fee: b.fee,
    stripe_payment_intent_id: b.paymentIntentId,
    stripe_session_id: params.sessionId ?? null,
    source_type: params.source,
    description: params.description,
    category_id: await categoryId(supabase, params.categoryName),
    note,
    receipt_url: null,
  })

  if (error) {
    // 23505 = unique_violation: this payment is already recorded.
    if (error.code === '23505') return false
    throw new Error(`transactions insert failed: ${error.message}`)
  }
  return true
}
