'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

const TEAM_LABELS: Record<string, string> = {
  lab: 'Lab',
  events: 'Events',
  media: 'Media',
  alumni: 'Alumni',
}

const LAB_SUBDIVISION_LABELS: Record<string, string> = {
  macro_markets: 'Macro & Markets',
  equity_valuation: 'Equity & Valuation',
  ma: 'M&A',
}

type InviteData = {
  email: string
  team: string
  lab_subdivision: string | null
}

type PageStatus = 'loading' | 'ready' | 'not_found' | 'used' | 'error'

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<PageStatus>(() => (token ? 'loading' : 'not_found'))
  const [invite, setInvite] = useState<InviteData | null>(null)

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState<React.ReactNode | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) return

    let cancelled = false

    async function loadInvite() {
      try {
        const res = await fetch(`/api/accept-invite?token=${encodeURIComponent(token as string)}`)
        if (cancelled) return

        if (res.status === 404) {
          setStatus('not_found')
          return
        }
        if (res.status === 410) {
          setStatus('used')
          return
        }
        if (!res.ok) {
          setStatus('error')
          return
        }

        const data = (await res.json()) as InviteData
        setInvite(data)
        setStatus('ready')
      } catch {
        if (!cancelled) setStatus('error')
      }
    }

    loadInvite()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!fullName.trim()) {
      setFormError('Full name is required.')
      return
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          password,
        }),
      })

      if (res.status === 409) {
        setFormError(
          <>
            Questo indirizzo email risulta già registrato.{' '}
            <Link href="/login" className="text-forest underline hover:no-underline">
              Vai al login
            </Link>
            .
          </>
        )
        setSubmitting(false)
        return
      }

      if (res.status === 410) {
        // Invite consumed in the meantime (race condition) — fall back to
        // the same "already used" state shown for a stale link.
        setStatus('used')
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        const text = await res.text()
        let detail: string | undefined
        try {
          detail = text ? JSON.parse(text).error : undefined
        } catch {
          detail = undefined
        }
        setFormError(detail || 'Si è verificato un errore. Riprova più tardi.')
        setSubmitting(false)
        return
      }

      router.push('/login?msg=account-created')
    } catch {
      setFormError('Errore di rete. Riprova.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — image panel */}
      <div className="hidden md:block md:w-1/2 relative">
        <Image
          src="/capitolino.jpg"
          alt="Capitolino"
          fill
          className="object-cover grayscale"
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div style={{ position: 'relative', zIndex: 1 }} className="h-full flex flex-col items-center justify-center px-12 text-white text-center">
          <p className="font-serif italic text-3xl lg:text-4xl leading-snug mb-5">
            Great investments start with great people.
          </p>
          <p className="text-xs tracking-widest uppercase text-white/60">
            Alata Investment Club — Brescia
          </p>
        </div>
      </div>

      {/* Right — form panel */}
      <div className="w-full md:w-1/2 bg-white flex items-center justify-center py-16 px-6 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <Link href="/" className="inline-block">
              <div style={{ background: 'white', boxShadow: '0 8px 48px rgba(0,0,0,0.15)', border: '1px solid #1a4a3a', outline: '3px solid #1a4a3a', outlineOffset: '-7px' }}>
                <Image
                  src="/white-black.png"
                  alt="Alata Investment Club"
                  width={140}
                  height={140}
                  className="object-contain"
                />
              </div>
            </Link>
            <h1 className="font-serif text-2xl font-light text-ink-900 mt-6">Create Your Account</h1>
            <p className="text-ink-500 text-sm mt-1">Set a password to complete your registration.</p>
          </div>

          <div className="bg-white p-8 border border-line">
            {status === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-ink-500">
                <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying invite link…
              </div>
            )}

            {status === 'not_found' && (
              <div className="space-y-4">
                <p className="text-red-600 text-sm border-l-2 border-red-400 pl-3 py-1">
                  Invito non valido o non trovato.
                </p>
                <p className="text-xs text-ink-500">
                  Contact{' '}
                  <a href="mailto:info@alatainvestmentclub.com" className="text-forest hover:underline">
                    info@alatainvestmentclub.com
                  </a>{' '}
                  to receive a new invitation, or{' '}
                  <Link href="/login" className="text-forest hover:underline">
                    go to login
                  </Link>
                  .
                </p>
              </div>
            )}

            {status === 'used' && (
              <div className="space-y-4">
                <p className="text-red-600 text-sm border-l-2 border-red-400 pl-3 py-1">
                  Questo invito è già stato utilizzato.
                </p>
                <p className="text-xs text-ink-500">
                  If you already created your account,{' '}
                  <Link href="/login" className="text-forest hover:underline">
                    sign in here
                  </Link>
                  . Otherwise contact{' '}
                  <a href="mailto:info@alatainvestmentclub.com" className="text-forest hover:underline">
                    info@alatainvestmentclub.com
                  </a>
                  .
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <p className="text-red-600 text-sm border-l-2 border-red-400 pl-3 py-1">
                  Si è verificato un errore. Riprova più tardi.
                </p>
                <p className="text-xs text-ink-500">
                  <Link href="/login" className="text-forest hover:underline">
                    Go to login
                  </Link>
                </p>
              </div>
            )}

            {status === 'ready' && invite && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Email
                  </label>
                  <div className="w-full px-4 py-3 border border-line bg-black/5 text-ink-900 text-sm">
                    {invite.email}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Team
                  </label>
                  <div className="w-full px-4 py-3 border border-line bg-black/5 text-ink-900 text-sm">
                    {TEAM_LABELS[invite.team] ?? invite.team}
                  </div>
                </div>

                {invite.lab_subdivision && (
                  <div>
                    <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                      Subdivision
                    </label>
                    <div className="w-full px-4 py-3 border border-line bg-black/5 text-ink-900 text-sm">
                      {LAB_SUBDIVISION_LABELS[invite.lab_subdivision] ?? invite.lab_subdivision}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Phone <span className="text-ink-400 normal-case">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+39 333 123 4567"
                    className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
                  />
                </div>

                {formError && (
                  <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide py-3.5 px-6 transition-colors duration-fast flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {submitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating…
                    </>
                  ) : (
                    'Set Password & Create Account'
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-ink-500 hover:text-ink-900 tracking-wide transition-colors">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div />}>
      <AcceptInviteForm />
    </Suspense>
  )
}
