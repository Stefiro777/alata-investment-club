'use client'

import { useState, useEffect, Suspense } from 'react'
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
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('msg') === 'account-created') {
      setSuccessMsg('Account created successfully. You can now sign in.')
    }
  }, [searchParams])

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

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen">
      {/* Left — image panel */}
      <div
        className="hidden md:block md:w-1/2 relative"
        style={{ animation: 'heroFadeIn 0.9s ease both' }}
      >
        <Image
          src="/capitolino.jpg"
          alt="Capitolino"
          fill
          className="object-cover grayscale"
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div style={{ position: 'relative', zIndex: 1 }} className="h-full flex flex-col items-center justify-center px-12 text-white text-center">
          <p
            className="font-serif italic text-3xl lg:text-4xl leading-snug mb-5"
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
        </div>
      </div>

      {/* Right — form panel */}
      <div
        className="w-full md:w-1/2 flex items-center justify-center py-16 px-6 sm:px-12"
        style={{ background: '#f5f5f0', animation: 'heroFadeIn 0.7s ease 0.1s both' }}
      >
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10" style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both' }}>
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
            <h1 className="font-serif text-2xl font-light text-black mt-6">Members Area</h1>
            <p className="text-black text-sm mt-1">
              Sign in to access exclusive materials.
            </p>
          </div>

          {/* Form card */}
          <div
            className="bg-white p-8 border border-line"
            style={{ animation: 'heroFadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both' }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.38s both' }}>
                <label htmlFor="email" className="block text-xs font-medium tracking-wide uppercase text-black mb-2">
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
                  className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
                />
              </div>

              <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.46s both' }}>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-black">
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
                  className="w-full px-4 py-3 border border-line focus:outline-none focus:border-forest text-ink-900 placeholder-ink-300 text-sm transition-colors bg-white"
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
                  className="w-full bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide py-3.5 px-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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

            <p className="text-center text-xs text-black mt-6 pt-6 border-t border-[#f5f5f5]">
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
