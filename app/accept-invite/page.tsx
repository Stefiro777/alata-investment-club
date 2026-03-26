'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'
import Link from 'next/link'

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Debug
    console.log('URL:', window.location.href)
    console.log('Hash:', window.location.hash)
    console.log('Search:', window.location.search)

    // Parse hash fragment manually (not accessible via useSearchParams)
    const hash = window.location.hash.substring(1)
    const hashParams = new URLSearchParams(hash)

    const token_hash = searchParams.get('token_hash')
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token') ?? ''
    const type = searchParams.get('type') ?? hashParams.get('type') ?? 'invite'

    console.log('token_hash:', token_hash)
    console.log('access_token:', access_token ? 'present' : 'absent')
    console.log('type:', type)

    if (token_hash) {
      // New Supabase format: ?token_hash=...&type=invite
      supabase.auth
        .verifyOtp({ token_hash, type: type as 'invite' })
        .then(({ error }) => {
          if (error) {
            console.error('verifyOtp error:', error)
            setTokenError(error.message)
          } else {
            setSessionReady(true)
          }
        })
    } else if (access_token) {
      // Old Supabase format: #access_token=...
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            console.error('setSession error:', error)
            setTokenError(error.message)
          } else {
            setSessionReady(true)
          }
        })
    } else {
      // No token found — wait briefly for onAuthStateChange in case
      // the Supabase client parses the hash automatically
      const timeout = setTimeout(() => {
        setTokenError('Invalid or expired invite link. Please request a new invitation.')
      }, 3000)

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        console.log('onAuthStateChange event:', event)
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          clearTimeout(timeout)
          setSessionReady(true)
        }
      })

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    }
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName.trim() || undefined },
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?msg=account-created')
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
                  src="/logofronte.png"
                  alt="Alata Investment Club"
                  width={140}
                  height={140}
                  className="object-contain"
                />
              </div>
            </Link>
            <h1 className="font-serif text-2xl font-light text-[#0a0a0a] mt-6">Create Your Account</h1>
            <p className="text-[#6b7280] text-sm mt-1">Set a password to complete your registration.</p>
          </div>

          <div className="bg-white p-8 border border-[#e5e5e5]">
            {tokenError ? (
              <div className="space-y-4">
                <p className="text-red-600 text-sm border-l-2 border-red-400 pl-3 py-1">{tokenError}</p>
                <p className="text-xs text-[#6b7280]">
                  Contact{' '}
                  <a href="mailto:alatabrixiaic@gmail.com" className="text-[#1a4a3a] hover:underline">
                    alatabrixiaic@gmail.com
                  </a>{' '}
                  to receive a new invitation.
                </p>
              </div>
            ) : !sessionReady ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-[#6b7280]">
                <svg className="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying invite link…
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
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
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-[#0a0a0a] placeholder-[#d1d5db] text-sm transition-colors bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">
                    Confirm Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-[#0a0a0a] placeholder-[#d1d5db] text-sm transition-colors bg-white"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
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
            <Link href="/" className="text-xs text-[#6b7280] hover:text-[#0a0a0a] tracking-wide transition-colors">
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
