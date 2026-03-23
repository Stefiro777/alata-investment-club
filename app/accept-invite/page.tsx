'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function AcceptInvitePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    // The invite token in the URL hash is automatically picked up by the browser client.
    // We wait for the SIGNED_IN event to confirm the session is established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setSessionReady(true)
      }
    })

    // Also check if session already exists (in case auth state fired before listener)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

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
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?msg=account-created')
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center py-16 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="font-serif text-2xl font-light text-[#0a0a0a]">Create Your Account</h1>
          <p className="text-[#6b7280] text-sm mt-1">Set a password to complete your registration.</p>
        </div>

        <div className="bg-white p-8 border border-[#e5e5e5]">
          {!sessionReady ? (
            <p className="text-sm text-[#6b7280] text-center py-4">Verifying invite link…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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
                  'Create Account'
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
  )
}
