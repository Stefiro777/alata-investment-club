'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
                  src="/logofronte.png"
                  alt="Alata Investment Club"
                  width={140}
                  height={140}
                  className="object-contain"
                />
              </div>
            </Link>
            <h1 className="font-serif text-2xl font-light text-[#0a0a0a] mt-6">Members Area</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Sign in to access exclusive materials.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white p-8 border border-[#e5e5e5]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
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
                  className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-[#0a0a0a] placeholder-[#d1d5db] text-sm transition-colors bg-white"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-[#0a0a0a] placeholder-[#d1d5db] text-sm transition-colors bg-white"
                />
              </div>

              {error && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide py-3.5 px-6 transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
            </form>

            <p className="text-center text-xs text-[#6b7280] mt-6 pt-6 border-t border-[#f5f5f5]">
              Don&apos;t have an account?{' '}
              <span className="text-[#1a4a3a] font-medium">Contact the administrator.</span>
            </p>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-[#6b7280] hover:text-[#0a0a0a] tracking-wide transition-colors">
              ← Back to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
