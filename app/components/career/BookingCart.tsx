'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CartSuggestion = {
  id: string
  type: string
  reference_id: string
  label: string
  description: string | null
  price_cents: number
  image_url: string | null
}

export type CartItem = {
  id: string
  label: string
  price_cents: number
}

type Props = {
  serviceName: string
  servicePrice: number
  isMember: boolean
  slot: { date: string; time: string }
  formatDate: (d: string) => string
  onProceed: (extras: CartItem[]) => void
  onBack: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

// ── BookingCart ───────────────────────────────────────────────────────────────

export default function BookingCart({
  serviceName,
  servicePrice,
  isMember,
  slot,
  formatDate,
  onProceed,
  onBack,
}: Props) {
  const [suggestions, setSuggestions]   = useState<CartSuggestion[]>([])
  const [loading, setLoading]           = useState(true)
  const [added, setAdded]               = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/cart-suggestions')
      .then(r => r.json())
      .then(d => { setSuggestions((d.suggestions ?? []).slice(0, 3)); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function toggle(s: CartSuggestion) {
    setAdded(prev => {
      const next = new Set(prev)
      if (next.has(s.id)) next.delete(s.id)
      else next.add(s.id)
      return next
    })
  }

  const isFree     = isMember || servicePrice === 0
  const baseAmount = isFree ? 0 : servicePrice
  const extras     = suggestions.filter(s => added.has(s.id))
  const extrasTotal = extras.reduce((sum, s) => sum + s.price_cents, 0)
  const total      = baseAmount + extrasTotal

  function handleProceed() {
    onProceed(extras.map(s => ({ id: s.id, label: s.label, price_cents: s.price_cents })))
  }

  return (
    <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Riepilogo prenotazione */}
      <div className="border border-gray-200 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
          Riepilogo Prenotazione
        </p>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{serviceName}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatDate(slot.date)} — {slot.time}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {isMember ? (
              <div>
                <p className="text-sm line-through text-gray-300">{formatEuros(servicePrice)}</p>
                <p className="text-xs font-semibold text-forest uppercase tracking-widest">Member Free</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-900">
                {servicePrice === 0 ? 'Free' : formatEuros(servicePrice)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Suggerimenti */}
      {(loading || suggestions.length > 0) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Potrebbe Interessarti
          </p>
          {loading ? (
            <p className="text-sm text-gray-400">Caricamento…</p>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => {
                const isAdded = added.has(s.id)
                return (
                  <div
                    key={s.id}
                    className="border border-gray-200 p-4 flex gap-4 items-start"
                    style={{ borderColor: isAdded ? '#1a4a3a' : undefined }}
                  >
                    {s.image_url && (
                      <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden bg-gray-100">
                        <Image src={s.image_url} alt={s.label} fill className="object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                      {s.description && (
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.description}</p>
                      )}
                      <p className="text-xs font-semibold text-gray-700 mt-1">
                        {s.price_cents === 0 ? 'Gratuito' : formatEuros(s.price_cents)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggle(s)}
                      className="flex-shrink-0 text-xs font-semibold uppercase tracking-widest px-4 py-2 border transition-colors"
                      style={{
                        background: isAdded ? '#1a4a3a' : 'transparent',
                        color: isAdded ? '#fff' : 'var(--forest)',
                        borderColor: 'var(--forest)',
                      }}
                    >
                      {isAdded ? 'Rimosso ✓' : 'Aggiungi'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Totale */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Totale</p>
          <p className="text-lg font-bold text-gray-900">
            {total === 0 ? 'Gratuito' : formatEuros(total)}
          </p>
        </div>
        {extras.length > 0 && (
          <div className="space-y-0.5 mb-4">
            {extras.map(e => (
              <div key={e.id} className="flex justify-between text-xs text-gray-400">
                <span>{e.label}</span>
                <span>{formatEuros(e.price_cents)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={handleProceed}
        className="w-full bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors"
      >
        Procedi al Pagamento →
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-gray-400 hover:text-gray-700 transition-colors text-center"
      >
        ← Torna ai dettagli
      </button>
    </div>
  )
}
