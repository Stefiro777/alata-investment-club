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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function formatEuros(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

export default function MembershipPage() {
  const searchParams = useSearchParams()
  const isExpiredParam = searchParams.get('expired') === 'true'
  const isSuccess      = searchParams.get('membership') === 'success' ||
                         new URLSearchParams(window.location.search).get('membership') === 'success'

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

      const [{ data: m }, { data: s }] = await Promise.all([
        supabase
          .from('club_members')
          .select('full_name, email, membership_expires_at')
          .eq('email', user.email ?? '')
          .maybeSingle(),
        fetch('/api/membership/settings').then(r => r.json()),
      ])

      if (m) setMember(m as MemberData)
      if (s?.settings) setSettings(s.settings as Settings)
      setLoading(false)
    }
    load()
  }, [])

  async function handleRenew() {
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

  const expires    = member?.membership_expires_at ? new Date(member.membership_expires_at) : null
  const now        = new Date()
  const diffMs     = expires ? expires.getTime() - now.getTime() : null
  const isExpired  = diffMs !== null && diffMs <= 0
  const isSoon     = diffMs !== null && diffMs > 0 && Math.floor(diffMs / 86400000) <= 7
  const isActive   = !isExpired && !isSoon

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-8 py-12" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Page title */}
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

          {/* Status banner */}
          {isExpired && (
            <div className="mb-6 border border-red-400 bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-red-600 mb-0.5">
                  Membership scaduta
                </p>
                <p className="text-sm text-red-500">
                  Rinnova per riprendere l&apos;accesso completo.
                </p>
              </div>
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

              {error && (
                <p className="mb-4 text-xs text-red-600 border-l-2 border-red-400 pl-3">{error}</p>
              )}

              <button
                onClick={handleRenew}
                disabled={paying}
                className="w-full bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors disabled:opacity-40"
              >
                {paying ? 'Reindirizzamento…' : 'RINNOVA ORA →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
