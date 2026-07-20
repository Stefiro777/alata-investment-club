'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { DashboardProfileProvider, type MemberProfile } from './DashboardProfileContext'
import DashboardNav from './DashboardNav'

function MembershipBadge({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null

  const now       = new Date()
  const expiry    = new Date(expiresAt)
  const diffMs    = expiry.getTime() - now.getTime()
  const diffDays  = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const isExpired = diffMs <= 0
  const isSoon    = !isExpired && diffDays <= 7

  const formatted = expiry.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  if (isExpired) {
    return (
      <Link href="/dashboard/membership" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-red-600">
        <span className="w-2 h-2 bg-red-500 inline-block" />
        Membership scaduta — <span className="underline">Rinnova</span>
      </Link>
    )
  }

  if (isSoon) {
    return (
      <Link href="/dashboard/membership" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-yellow-700">
        <span className="w-2 h-2 bg-yellow-400 inline-block" />
        Membership scade il {formatted} — <span className="underline">Rinnova</span>
      </Link>
    )
  }

  return (
    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-forest">
      <span className="w-2 h-2 bg-forest inline-block" />
      Membership attiva fino al {formatted}
    </p>
  )
}

type Status = 'loading' | 'ok' | 'not-found' | 'unauthenticated'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  const loadProfile = useCallback(async () => {
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setStatus('unauthenticated')
      router.push('/login')
      return
    }

    const { data: profileData, error } = await supabase
      .from('club_members')
      .select('full_name, role, teams, membership_expires_at, member_id, created_at')
      .eq('email', user?.email ?? '')
      .maybeSingle()

    console.log('Profile loaded:', profileData)

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
      full_name:             (profileData as any).full_name             ?? 'Member',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role:                  (profileData as any).role                  ?? 'member',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      teams:                 (profileData as any).teams                 ?? null,
      email:                 user.email ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      membership_expires_at: (profileData as any).membership_expires_at ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      member_id:             (profileData as any).member_id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      created_at:            (profileData as any).created_at ?? null,
    })
    setStatus('ok')
  }, [router])

  // Fetch iniziale + re-fetch a ogni cambio di route, così i dati
  // (es. teams) riflettono eventuali modifiche fatte da un admin mentre
  // la dashboard è aperta, senza bisogno di un reload manuale.
  useEffect(() => {
    loadProfile()
  }, [pathname, loadProfile])

  // Re-fetch quando la tab torna in foreground, per lo stesso motivo.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadProfile()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [loadProfile])

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
          <div className="w-12 h-px bg-forest mb-4" />
          <MembershipBadge expiresAt={profile.membership_expires_at} />
        </div>
      </div>

      {/* Page content */}
      {children}
    </DashboardProfileProvider>
  )
}
