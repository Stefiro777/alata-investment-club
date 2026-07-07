'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '')

type Settings   = { price_cents: number; description: string | null }
type MemberData = { full_name: string; email: string; membership_expires_at: string | null }
type View = 'main' | 'summary' | 'payment' | 'success'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}
function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}
function nextYearDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Stripe Elements payment form ──────────────────────────────────────────────

const ELEM_STYLE = {
  base: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px',
    color: '#1a1a1a',
    '::placeholder': { color: '#9ca3af' },
  },
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 600, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--forest)' }}>
      {children}
    </p>
  )
}

function PaymentForm({
  clientSecret,
  priceCents,
  onSuccess,
}: {
  clientSecret: string
  priceCents: number
  onSuccess: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [name,       setName]       = useState('')
  const [focused,    setFocused]    = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  function border(field: string) {
    return focused === field ? '1px solid #1a4a3a' : '1px solid #d1d5db'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setProcessing(true)
    setError(null)

    const cardNumber = elements.getElement(CardNumberElement)
    if (!cardNumber) { setProcessing(false); return }

    try {
      const { error: stripeErr, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumber,
          billing_details: { name },
        },
      })

      if (stripeErr) {
        setError(stripeErr.message ?? 'Errore durante il pagamento')
        setProcessing(false)
        return
      }

      if (paymentIntent?.status === 'succeeded') {
        onSuccess()
      } else {
        setError('Pagamento non completato. Riprova.')
        setProcessing(false)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Name */}
      <div className="mb-5">
        <FieldLabel>Nome sulla carta</FieldLabel>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
          placeholder="Mario Rossi"
          required
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 14, color: '#1a1a1a',
            padding: '12px', border: border('name'),
            borderRadius: 0, outline: 'none',
            fontFamily: 'Inter, sans-serif',
          }}
        />
      </div>

      {/* Card number */}
      <div className="mb-5">
        <FieldLabel>Numero carta</FieldLabel>
        <div style={{ padding: '12px', border: border('number') }}>
          <CardNumberElement
            options={{ style: ELEM_STYLE }}
            onFocus={() => setFocused('number')}
            onBlur={() => setFocused(null)}
          />
        </div>
      </div>

      {/* Expiry + CVC */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div>
          <FieldLabel>Scadenza</FieldLabel>
          <div style={{ padding: '12px', border: border('expiry') }}>
            <CardExpiryElement
              options={{ style: ELEM_STYLE }}
              onFocus={() => setFocused('expiry')}
              onBlur={() => setFocused(null)}
            />
          </div>
        </div>
        <div>
          <FieldLabel>CVC</FieldLabel>
          <div style={{ padding: '12px', border: border('cvc') }}>
            <CardCvcElement
              options={{ style: ELEM_STYLE }}
              onFocus={() => setFocused('cvc')}
              onBlur={() => setFocused(null)}
            />
          </div>
        </div>
      </div>

      {error && (
        <p style={{ marginBottom: 16, fontSize: 12, color: '#dc2626', borderLeft: '2px solid #f87171', paddingLeft: 12 }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={processing || !stripe}
        style={{
          width: '100%', height: 48,
          background: processing || !stripe ? '#9ca3af' : 'var(--forest)',
          color: 'white', border: 'none', cursor: processing || !stripe ? 'not-allowed' : 'pointer',
          fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {processing ? (
          <>
            <svg style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} fill="none" viewBox="0 0 24 24">
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Elaborazione…
          </>
        ) : `PAGA ${formatEuros(priceCents)}`}
      </button>
    </form>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MembershipPage() {
  const searchParams   = useSearchParams()
  const router         = useRouter()
  const isExpiredParam = searchParams.get('expired') === 'true'
  const isNewMember    = searchParams.get('new') === 'true'

  const [view,         setView]         = useState<View>('main')
  const [member,       setMember]       = useState<MemberData | null>(null)
  const [settings,     setSettings]     = useState<Settings | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [fetching,     setFetching]     = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [piError,      setPiError]      = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: m }, sRes] = await Promise.all([
        supabase
          .from('club_members')
          .select('full_name, email, membership_expires_at')
          .eq('email', user.email ?? '')
          .maybeSingle(),
        fetch('/api/membership/settings'),
      ])

      console.log('[membership/settings] status:', sRes.status, 'content-type:', sRes.headers.get('content-type'))
      if (sRes.ok && sRes.headers.get('content-type')?.includes('application/json')) {
        try {
          const s = await sRes.json()
          if (s?.settings) setSettings(s.settings as Settings)
        } catch (e) {
          console.error('[membership/settings] JSON parse error:', e)
        }
      } else {
        const raw = await sRes.text()
        console.error('[membership/settings] unexpected response:', raw.slice(0, 200))
      }

      if (m) setMember(m as MemberData)
      setLoading(false)
    }
    load()
  }, [])

  async function handleGoToPayment() {
    setFetching(true)
    setPiError(null)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        setPiError('Sessione scaduta. Ricarica la pagina.')
        return
      }

      const res = await fetch('/api/membership/payment-intent', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log('[payment-intent] status:', res.status, 'content-type:', res.headers.get('content-type'))

      let data: { clientSecret?: string; error?: string } = {}
      if (res.headers.get('content-type')?.includes('application/json')) {
        try {
          data = await res.json()
        } catch (e) {
          console.error('[payment-intent] JSON parse error:', e)
          setPiError('Risposta non valida dal server. Riprova.')
          return
        }
      } else {
        const raw = await res.text()
        console.error('[payment-intent] unexpected response:', raw.slice(0, 200))
        setPiError('Errore del server. Riprova.')
        return
      }

      if (!res.ok || !data.clientSecret) {
        setPiError(data.error ?? 'Errore durante la preparazione del pagamento')
        return
      }

      setClientSecret(data.clientSecret)
      setView('payment')
    } catch (err: unknown) {
      setPiError(err instanceof Error ? err.message : 'Errore di rete. Riprova.')
    } finally {
      setFetching(false)
    }
  }

  const expires   = member?.membership_expires_at ? new Date(member.membership_expires_at) : null
  const diffMs    = expires ? expires.getTime() - Date.now() : null
  const isExpired = diffMs !== null && diffMs <= 0
  const isSoon    = diffMs !== null && diffMs > 0 && Math.floor(diffMs / 86400000) <= 7
  const isActive  = !isExpired && !isSoon

  // ── Success ───────────────────────────────────────────────────────────────
  if (view === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex flex-col items-center text-center py-12">
          <div className="w-16 h-16 bg-forest flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl font-bold text-gray-900 mb-3">Pagamento completato</h1>
          <div className="w-8 h-px bg-forest mb-5" />
          <p className="text-sm text-gray-600 mb-2">La tua membership è stata rinnovata con successo.</p>
          <p className="text-sm font-semibold text-forest mb-8">Valida fino al {nextYearDate()}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest px-8 py-4 transition-colors"
          >
            TORNA ALLA DASHBOARD
          </button>
        </div>
      </div>
    )
  }

  // ── Payment form ──────────────────────────────────────────────────────────
  if (view === 'payment' && clientSecret) {
    return (
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="mb-8">
          <button
            onClick={() => setView('summary')}
            className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
          >
            ← Torna al riepilogo
          </button>
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Pagamento</h1>
          <div className="w-8 h-px bg-forest" />
        </div>

        <div className="border border-gray-100 bg-gray-50 px-5 py-4 mb-6 flex justify-between items-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Membership Annuale</p>
          <p className="font-serif text-lg font-bold text-gray-900">
            {settings ? formatEuros(settings.price_cents) : '—'}
          </p>
        </div>

        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm
            clientSecret={clientSecret}
            priceCents={settings?.price_cents ?? 0}
            onSuccess={() => setView('success')}
          />
        </Elements>
      </div>
    )
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (view === 'summary') {
    return (
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="mb-10">
          <button
            onClick={() => { setView('main'); setPiError(null) }}
            className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1"
          >
            ← Torna indietro
          </button>
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Riepilogo ordine</h1>
          <div className="w-8 h-px bg-forest" />
        </div>

        <div className="border border-gray-200 p-6 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">Dettagli</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Servizio</span>
              <span className="font-semibold text-gray-900">Membership Annuale Alata Investment Club</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Periodo</span>
              <span className="font-semibold text-gray-900">Valida fino al {nextYearDate()}</span>
            </div>
            {member && (
              <div className="flex justify-between">
                <span className="text-gray-500">Intestatario</span>
                <span className="font-semibold text-gray-900">{member.full_name}</span>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 mt-5 pt-5 flex justify-between items-baseline">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Totale</span>
            <span className="font-serif text-3xl font-bold text-gray-900">
              {settings ? formatEuros(settings.price_cents) : '—'}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6">
          Il pagamento è sicuro e protetto. I dati della carta non vengono mai salvati.
        </p>

        {piError && (
          <p className="mb-4 text-xs text-red-600 border-l-2 border-red-400 pl-3">{piError}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoToPayment}
            disabled={fetching}
            className="w-full bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {fetching ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Preparazione…
              </>
            ) : 'PROCEDI AL PAGAMENTO →'}
          </button>
          <button
            onClick={() => { setView('main'); setPiError(null) }}
            disabled={fetching}
            className="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold uppercase tracking-widest py-3 transition-colors disabled:opacity-40"
          >
            ANNULLA
          </button>
        </div>
      </div>
    )
  }

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-10">
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Membership</h1>
        <div className="w-8 h-px bg-forest" />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Caricamento…</p>
      ) : (
        <>
          {isNewMember && (
            <div className="mb-6 border border-forest bg-forest/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-forest mb-1">
                Benvenuto in Alata Investment Club!
              </p>
              <p className="text-sm text-gray-600">
                Per accedere alla dashboard completa è necessario attivare la tua membership.
              </p>
            </div>
          )}

          {isExpiredParam && !isNewMember && (
            <div className="mb-6 border border-red-400 bg-red-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
                La tua membership è scaduta — rinnova per accedere alla dashboard.
              </p>
            </div>
          )}

          {member && (
            <div className="border border-gray-200 p-6 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">I tuoi dati</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Nome</span>
                  <span className="font-semibold text-gray-900">{member.full_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-semibold text-gray-900">{member.email}</span>
                </div>
                {expires && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Scadenza</span>
                    <span className={`font-semibold ${isExpired ? 'text-red-600' : isSoon ? 'text-yellow-700' : 'text-forest'}`}>
                      {formatDate(expires.toISOString())}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mb-6 border border-red-400 bg-red-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-0.5">Membership scaduta</p>
              <p className="text-sm text-red-500">Rinnova per riprendere l&apos;accesso completo.</p>
            </div>
          )}
          {isSoon && !isExpired && (
            <div className="mb-6 border border-yellow-400 bg-yellow-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow-700 mb-0.5">Scade tra pochi giorni</p>
              <p className="text-sm text-yellow-600">
                La tua membership scade il {expires ? formatDate(expires.toISOString()) : '—'}. Rinnova ora.
              </p>
            </div>
          )}
          {isActive && (
            <div className="mb-6 border border-forest bg-forest/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-forest">
                Membership attiva fino al {expires ? formatDate(expires.toISOString()) : '—'}
              </p>
            </div>
          )}

          <div className="border border-gray-200 p-6">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Quota annuale</p>
            <p className="font-serif text-3xl font-bold text-gray-900 mb-1">
              {settings ? formatEuros(settings.price_cents) : '—'}
            </p>
            {settings?.description && (
              <p className="text-sm text-gray-500 mb-6">{settings.description}</p>
            )}
            <button
              onClick={() => setView('summary')}
              className="w-full bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors"
            >
              RINNOVA ORA →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
