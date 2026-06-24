'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Settings = {
  price_cents: number
  description: string | null
}

type MemberData = {
  full_name: string
  email: string
  membership_expires_at: string | null
}

type View = 'main' | 'summary'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function nextYearDate(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function MembershipPage() {
  const searchParams = useSearchParams()
  const isExpiredParam = searchParams.get('expired') === 'true'
  const isSuccess      = searchParams.get('membership') === 'success'

  const [view,     setView]     = useState<View>('main')
  const [member,   setMember]   = useState<MemberData | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [paying,   setPaying]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)

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
      const s = await sRes.json()

      if (m) setMember(m as MemberData)
      if (s?.settings) setSettings(s.settings as Settings)
      setLoading(false)
    }
    load()
  }, [])

  async function handleCheckout() {
    setPaying(true); setError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setError('Non autenticato'); setPaying(false); return }

    const res = await fetch('/api/membership/checkout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok || !data.url) {
      setError(data.error ?? 'Errore durante il checkout')
      setPaying(false)
      return
    }
    window.location.href = data.url
  }

  const expires   = member?.membership_expires_at ? new Date(member.membership_expires_at) : null
  const now       = new Date()
  const diffMs    = expires ? expires.getTime() - now.getTime() : null
  const isExpired = diffMs !== null && diffMs <= 0
  const isSoon    = diffMs !== null && diffMs > 0 && Math.floor(diffMs / 86400000) <= 7
  const isActive  = !isExpired && !isSoon

  // ── Summary / cart view ────────────────────────────────────────────────────
  if (view === 'summary') {
    return (
      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Riepilogo ordine</h1>
          <div className="w-8 h-px bg-[#1a4a3a]" />
        </div>

        {/* Order card */}
        <div className="border border-gray-200 p-6 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
            Dettagli
          </p>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Servizio</span>
              <span className="font-semibold text-gray-900 text-right max-w-xs">
                Membership Annuale Alata Investment Club
              </span>
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
          Il pagamento avviene su piattaforma Stripe sicura. Verrai reindirizzato al termine.
        </p>

        {error && (
          <p className="mb-4 text-xs text-red-600 border-l-2 border-red-400 pl-3">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleCheckout}
            disabled={paying}
            className="w-full bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {paying ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Reindirizzamento…
              </>
            ) : (
              'PROCEDI AL PAGAMENTO →'
            )}
          </button>
          <button
            onClick={() => { setView('main'); setError(null) }}
            disabled={paying}
            className="w-full border border-gray-300 text-gray-600 hover:bg-gray-50 text-xs font-semibold uppercase tracking-widest py-3 transition-colors disabled:opacity-40"
          >
            ANNULLA
          </button>
        </div>
      </div>
    )
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>

      <div className="mb-10">
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">Membership</h1>
        <div className="w-8 h-px bg-[#1a4a3a]" />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Caricamento…</p>
      ) : (
        <>
          {/* Success banner */}
          {isSuccess && (
            <div className="mb-6 border border-[#1a4a3a] bg-[#1a4a3a]/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a]">
                ✓ Membership rinnovata con successo!
              </p>
            </div>
          )}

          {/* Expired param banner */}
          {isExpiredParam && !isSuccess && (
            <div className="mb-6 border border-red-400 bg-red-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
                La tua membership è scaduta — rinnova per accedere alla dashboard.
              </p>
            </div>
          )}

          {/* Member info */}
          {member && (
            <div className="border border-gray-200 p-6 mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-4">
                I tuoi dati
              </p>
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
                    <span className={`font-semibold ${isExpired ? 'text-red-600' : isSoon ? 'text-yellow-700' : 'text-[#1a4a3a]'}`}>
                      {formatDate(expires.toISOString())}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status banners */}
          {isExpired && (
            <div className="mb-6 border border-red-400 bg-red-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-0.5">
                Membership scaduta
              </p>
              <p className="text-sm text-red-500">Rinnova per riprendere l&apos;accesso completo.</p>
            </div>
          )}

          {isSoon && !isExpired && (
            <div className="mb-6 border border-yellow-400 bg-yellow-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-yellow-700 mb-0.5">
                Scade tra pochi giorni
              </p>
              <p className="text-sm text-yellow-600">
                La tua membership scade il {expires ? formatDate(expires.toISOString()) : '—'}. Rinnova ora.
              </p>
            </div>
          )}

          {isActive && !isSuccess && (
            <div className="mb-6 border border-[#1a4a3a] bg-[#1a4a3a]/5 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a]">
                Membership attiva fino al {expires ? formatDate(expires.toISOString()) : '—'}
              </p>
            </div>
          )}

          {/* Pricing + CTA */}
          {!isSuccess && (
            <div className="border border-gray-200 p-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                Quota annuale
              </p>
              <p className="font-serif text-3xl font-bold text-gray-900 mb-1">
                {settings ? formatEuros(settings.price_cents) : '—'}
              </p>
              {settings?.description && (
                <p className="text-sm text-gray-500 mb-6">{settings.description}</p>
              )}

              <button
                onClick={() => setView('summary')}
                className="w-full bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors"
              >
                RINNOVA ORA →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
