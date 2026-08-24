'use client'

import { useState, useEffect } from 'react'
import { CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js'
import type { CartItem } from '../components/career/BookingCart'
import { formatDateLong, formatEuros } from './calendarUtils'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5'

export type ServiceInfo = { id: string; name: string; price_cents: number; duration_minutes: number | null }

export type BookingForm = {
  name: string
  email: string
  motivation: string
  goal: string
  cvUrl: string | null
}

/** Payment step of the booking flow — must be rendered inside <Elements>. */
export function PaymentForm({
  service,
  slot,
  form,
  isMember,
  authToken,
  extraItems,
  mentorId,
  onSuccess,
}: {
  service: ServiceInfo
  slot: { date: string; time: string }
  form: BookingForm
  isMember: boolean
  authToken: string | null
  extraItems: CartItem[]
  mentorId?: string | null
  onSuccess: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    console.log('[Stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', stripeKey || 'UNDEFINED/EMPTY')
    console.log('[Stripe] stripe instance:', stripe)
  }, [stripe])

  const isFree      = isMember || service.price_cents === 0
  const extrasTotal = extraItems.reduce((s, e) => s + e.price_cents, 0)
  const totalCents  = (isFree ? 0 : service.price_cents) + extrasTotal

  async function handleConfirm() {
    if (processing) return
    setProcessing(true); setError(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const res = await fetch('/api/career/book', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          service_id:  service.id,
          mentor_id:   mentorId ?? undefined,
          slot_date:   slot.date,
          slot_time:   slot.time,
          name:        form.name,
          email:       form.email,
          motivation:  form.motivation,
          goal:        form.goal,
          cv_url:      form.cvUrl ?? undefined,
          extra_items: extraItems.length > 0 ? extraItems : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Booking failed'); setProcessing(false); return }

      if (isFree) { onSuccess(); return }

      // Paid path — confirm card payment with Stripe
      if (!stripe || !elements) { setError('Stripe not loaded'); setProcessing(false); return }
      const cardEl = elements.getElement(CardNumberElement)
      if (!cardEl) { setError('Card element not found'); setProcessing(false); return }

      const { error: stripeErr } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: { card: cardEl },
      })
      if (stripeErr) { setError(stripeErr.message ?? 'Payment failed'); setProcessing(false); return }

      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="border border-gray-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Booking Summary</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{service.name}</span>
            <span className={`font-semibold ${isMember ? 'line-through text-gray-300' : 'text-gray-900'}`}>
              {service.price_cents === 0 ? 'Free' : formatEuros(service.price_cents)}
            </span>
          </div>
          <p className="text-xs text-gray-400">{formatDateLong(slot.date)} at {slot.time}</p>
          {extraItems.map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs text-gray-500">
              <span>+ {e.label}</span>
              <span>{formatEuros(e.price_cents)}</span>
            </div>
          ))}
          {(extraItems.length > 0 || !isFree) && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100 mt-1">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-gray-900">{totalCents === 0 ? 'Free' : formatEuros(totalCents)}</span>
            </div>
          )}
        </div>

        {/* Member badge */}
        {isMember && (
          <div className="mt-4 flex items-center gap-3 bg-forest/5 border border-forest/20 px-4 py-3">
            <svg className="w-4 h-4 text-forest flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-forest">Member Benefit — Free Session</p>
              <p className="text-xs text-gray-500 mt-0.5">€0,00</p>
            </div>
          </div>
        )}
      </div>

      {/* Card input */}
      {!isFree && (
        !stripeKey ? (
          <p className="text-sm text-red-600 border-l-2 border-red-400 pl-3">
            Payment unavailable — please contact us to book.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Card Number */}
            <div>
              <p className={labelCls}>Card Number</p>
              <div className="border border-gray-200 px-3" style={{ paddingTop: 12, paddingBottom: 12 }}>
                <CardNumberElement
                  options={{
                    style: {
                      base: { fontSize: '14px', color: '#1a1a1a', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#9ca3af' } },
                      invalid: { color: '#ef4444' },
                    },
                  }}
                />
              </div>
            </div>
            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelCls}>Expiry Date</p>
                <div className="border border-gray-200 px-3" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <CardExpiryElement
                    options={{
                      style: {
                        base: { fontSize: '14px', color: '#1a1a1a', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#9ca3af' } },
                        invalid: { color: '#ef4444' },
                      },
                    }}
                  />
                </div>
              </div>
              <div>
                <p className={labelCls}>CVC</p>
                <div className="border border-gray-200 px-3" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <CardCvcElement
                    options={{
                      style: {
                        base: { fontSize: '14px', color: '#1a1a1a', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#9ca3af' } },
                        invalid: { color: '#ef4444' },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {error && (
        <p className="text-xs text-red-600 border-l-2 border-red-400 pl-3">{error}</p>
      )}

      <button
        onClick={handleConfirm}
        disabled={processing || (!isFree && !stripe)}
        className="w-full bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors disabled:opacity-40"
      >
        {processing
          ? 'Processing…'
          : (isFree && extrasTotal === 0)
            ? 'Confirm Booking'
            : `Pay ${formatEuros(totalCents)} & Confirm`}
      </button>
    </div>
  )
}
