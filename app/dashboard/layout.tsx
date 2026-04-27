'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { DashboardProfileProvider, type MemberProfile } from './DashboardProfileContext'
import DashboardNav from './DashboardNav'

type Status = 'loading' | 'ok' | 'not-found' | 'unauthenticated'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      console.log('=== DASHBOARD AUTH DEBUG ===')
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('session:', sessionData.session)
      console.log('access_token present:', !!sessionData.session?.access_token)
      console.log('user email from session:', sessionData.session?.user?.email)

      const { data: { user } } = await supabase.auth.getUser()
      console.log('user from getUser():', user)

      // Test diretto: prova a fare una query che dovrebbe sempre funzionare
      const { data: testData, error: testError } = await supabase
        .from('club_members')
        .select('count')
        .limit(1)
      console.log('test query result:', testData, 'test error:', testError)

      if (!user) {
        setStatus('unauthenticated')
        router.push('/login')
        return
      }

      // Poi la query originale
      const { data: profileData, error } = await supabase
        .from('club_members')
        .select('full_name, role')
        .eq('email', user?.email ?? '')
        .maybeSingle()
      console.log('profile query result:', profileData, 'profile error:', error)
      console.log('=== END DEBUG ===')

      if (!profileData) {
        setStatus('not-found')
        return
      }

      setProfile({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        full_name: (profileData as any).full_name ?? 'Member',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role:      (profileData as any).role      ?? 'member',
        teams:     null,
      })
      setStatus('ok')
    }

    load()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-paper-stone flex items-center justify-center">
        <p className="text-sm text-ink-500">Loading…</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (status === 'not-found' || !profile) {
    return (
      <div className="min-h-screen bg-paper-stone flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-serif text-2xl text-ink-900">Profile not found</p>
          <p className="text-sm text-ink-500">Contact admin to get access.</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardProfileProvider profile={profile}>
      <DashboardNav profile={profile} />

      {/* Welcome header */}
      <div className="bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <h1 className="font-serif text-5xl font-semibold text-forest leading-tight">
            Welcome back, {profile.full_name}
          </h1>
          <div className="w-14 h-0.5 bg-forest mt-4" />
        </div>
      </div>

      {/* Page content */}
      {children}
    </DashboardProfileProvider>
  )
}
