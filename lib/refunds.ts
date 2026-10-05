import type Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TransactionSource } from '@/lib/stripe-finance'

/** Sources that can be refunded. Membership is deliberately excluded. */
export const REFUNDABLE_SOURCES: readonly TransactionSource[] = ['event', 'merch', 'career']

export type PaymentTransaction = {
  id: string
  description: string
  category_id: string | null
  amount: number
  gross_amount: number | null
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  source_type: TransactionSource | null
}

export const PAYMENT_TX_COLUMNS =
  'id, description, category_id, amount, gross_amount, stripe_payment_intent_id, stripe_session_id, source_type'

/**
 * Records a Stripe refund as a negative transaction and, for full refunds,
 * propagates the effect to the purchased item:
 *  - event ticket  -> event_registrations.status = 'refunded' (frees the seat)
 *  - merch         -> merch_orders.status = 'refunded'
 *  - career        -> career_bookings.status = 'cancelled' (frees the slot)
 * Membership payments never touch club_members.membership_expires_at.
 *
 * "Negative transaction" = a row of type 'rimborso' (already an accepted type,
 * shown with a minus and summed with the costs). The amount is the GROSS
 * refunded to the customer: Stripe does not give the fee back, so the net
 * effect on the books is -fee.
 *
 * Idempotent per Stripe refund (unique index on stripe_refund_id): returns
 * false when this refund was already recorded.
 */
export async function recordRefund(
  supabase: SupabaseClient,
  params: {
    tx: PaymentTransaction
    refund: Pick<Stripe.Refund, 'id' | 'amount'>
    /** True when the payment is now refunded in full. */
    fullyRefunded: boolean
  },
): Promise<boolean> {
  const { tx, refund, fullyRefunded } = params
  const refundedAmount = refund.amount / 100

  const { error } = await supabase.from('transactions').insert({
    type: 'rimborso',
    date: new Date().toISOString().slice(0, 10),
    amount: refundedAmount,
    gross_amount: refundedAmount,
    description: `Rimborso: ${tx.description}`.slice(0, 250),
    category_id: tx.category_id,
    stripe_payment_intent_id: tx.stripe_payment_intent_id,
    stripe_session_id: tx.stripe_session_id,
    stripe_refund_id: refund.id,
    refund_of: tx.id,
    source_type: tx.source_type,
    note: `Rimborso Stripe ${refund.id} | ${tx.stripe_payment_intent_id ?? ''}`,
    receipt_url: null,
  })
  if (error) {
    if (error.code === '23505') return false // already recorded
    throw new Error(`refund transaction insert failed: ${error.message}`)
  }

  if (fullyRefunded) await applyRefundEffects(supabase, tx)
  return true
}

async function applyRefundEffects(supabase: SupabaseClient, tx: PaymentTransaction): Promise<void> {
  if (tx.source_type === 'event' && tx.stripe_session_id) {
    const { error } = await supabase
      .from('event_registrations')
      .update({ status: 'refunded' })
      .eq('stripe_session_id', tx.stripe_session_id)
    if (error) console.error('[refund] event_registrations update failed:', error.message)
  } else if (tx.source_type === 'merch' && tx.stripe_session_id) {
    const { error } = await supabase
      .from('merch_orders')
      .update({ status: 'refunded' })
      .eq('stripe_session_id', tx.stripe_session_id)
    if (error) console.error('[refund] merch_orders update failed:', error.message)
    // A mixed cart (merch + tickets) shares the Checkout Session.
    await supabase
      .from('event_registrations')
      .update({ status: 'refunded' })
      .eq('stripe_session_id', tx.stripe_session_id)
  } else if (tx.source_type === 'career' && tx.stripe_payment_intent_id) {
    const { error } = await supabase
      .from('career_bookings')
      .update({ status: 'cancelled' })
      .eq('stripe_payment_intent_id', tx.stripe_payment_intent_id)
    if (error) console.error('[refund] career_bookings update failed:', error.message)
  }
}
