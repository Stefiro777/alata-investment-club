'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const successMsg = searchParams.get('msg') === 'account-created'
    ? 'Account created successfully. You can now sign in.'
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Invalid credentials. Please check your email and password.')
      setLoading(false)
      return
    }

    const to = searchParams.get('redirectTo')
    router.push(to && to.startsWith('/') && !to.startsWith('//') ? to : '/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — image panel */}
      <div
        className="hidden md:block md:w-1/2 relative bg-night overflow-hidden"
        style={{ animation: 'panelSlideRight 0.9s cubic-bezier(0.22,1,0.36,1) both' }}
      >
                <div style={{ position: 'relative', zIndex: 1 }} className="h-full flex flex-col items-center justify-center px-12 text-white text-center">
          <div
            className="w-10 h-px bg-white/40 mb-8"
            style={{ animation: 'heroFadeIn 0.8s ease 0.25s both' }}
          />
          <p
            className="font-serif italic font-medium text-[clamp(36px,3.6vw,52px)] leading-[1.15] mb-5"
            style={{ animation: 'heroFadeUp 0.9s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}
          >
            Great investments start with great people.
          </p>
          <p
            className="text-xs tracking-widest uppercase text-white/60"
            style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' }}
          >
            Alata Investment Club — Brescia
          </p>
          <div
            className="w-10 h-px bg-white/40 mt-8"
            style={{ animation: 'heroFadeIn 0.8s ease 0.6s both' }}
          />
        </div>
      </div>

      {/* Right — form panel */}
      <div
        className="w-full md:w-1/2 flex items-center justify-center py-16 px-6 sm:px-12"
        style={{ background: '#f5f1e8', animation: 'heroFadeIn 0.7s ease 0.1s both' }}
      >
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10" style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
            <Link href="/" className="inline-block">
              <Image src="/redesign/logo-dark.png" alt="Alata Investment Club" width={800} height={431} className="mx-auto h-11 w-auto" />
            </Link>
            <h1 className="font-serif text-[44px] font-medium leading-[1.1] text-night mt-8">Members Area</h1>
            <p className="text-black text-sm mt-1">
              Sign in to access exclusive materials.
            </p>
          </div>

          {/* Form card */}
          <div
            className="pt-2"
            style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.38s both' }}>
                <label htmlFor="email" className="block text-[13px] text-earth-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rd-field text-night"
                />
              </div>

              <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.46s both' }}>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-[13px] text-earth-700">
                    Password
                  </label>
                  <Link href="/forgot-password" className="underline-grow text-xs text-forest">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rd-field text-night"
                />
              </div>

              {successMsg && (
                <p className="text-forest text-xs border-l-2 border-forest pl-3 py-1">
                  {successMsg}
                </p>
              )}

              {error && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">
                  {error}
                </p>
              )}

              <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.54s both' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full bg-night hover:bg-moss text-ivory text-[12px] font-semibold uppercase tracking-[0.14em] py-4 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  style={{ transition: 'background-color 0.2s cubic-bezier(0.22,1,0.36,1)' }}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-black mt-6 pt-6 border-t border-night/15">
              Don&apos;t have an account?{' '}
              <a
                href="mailto:info@alatainvestmentclub.com"
                className="underline-grow text-forest font-medium"
              >
                Contact the administrator.
              </a>
            </p>
          </div>

          <div className="mt-6 text-center" style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.6s both' }}>
            <Link href="/" className="underline-grow text-xs text-black hover:text-ink-900 tracking-wide transition-colors">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginForm />
    </Suspense>
  )
}
