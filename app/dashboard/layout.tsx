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

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setStatus('unauthenticated')
        router.push('/login')
        return
      }

      const { data: profileData, error } = await supabase
        .from('club_members')
        .select('full_name, role, teams')
        .eq('email', user?.email ?? '')
        .maybeSingle()

      if (!profileData) {
        setStatus('not-found')
        return
      }

      // Collega user_id se non ancora collegato
      await supabase
        .from('club_members')
        .update({ user_id: user.id })
        .eq('email', user.email!)
        .is('user_id', null)

      setProfile({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        full_name: (profileData as any).full_name ?? 'Member',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role:      (profileData as any).role      ?? 'member',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teams:     (profileData as any).teams     ?? null,
        email:     user.email ?? '',
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
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-4">
            Welcome back, {profile.full_name}
          </h1>
          <div className="w-12 h-px bg-forest" />
        </div>
      </div>

      {/* Page content */}
      {children}
    </DashboardProfileProvider>
  )
}
