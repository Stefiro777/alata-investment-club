'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://alatainvestmentclub.com/reset-password',
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          {/* Logo */}
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
            <h1 className="font-serif text-2xl font-light text-ink-900 mt-6">Reset Password</h1>
            <p className="text-ink-500 text-sm mt-1">
              Enter your email to receive a reset link.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white p-8 border border-line">
            {sent ? (
              <p className="text-forest text-sm border-l-2 border-forest pl-3 py-1">
                Check your email for the reset link.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide py-3.5 px-6 transition-colors duration-fast flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-xs text-ink-500 hover:text-ink-900 tracking-wide transition-colors">
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
