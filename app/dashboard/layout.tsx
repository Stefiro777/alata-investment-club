'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { DashboardProfileProvider, type MemberProfile } from './DashboardProfileContext'
import MemberShell from '@/app/components/member/MemberShell'

type Status = 'loading' | 'ok' | 'not-found' | 'unauthenticated'
type Loaded = { status: Status; profile: MemberProfile | null }

/** Reads the session user and their club_members row (any column the DB has). */
async function loadProfile(): Promise<Loaded> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'unauthenticated', profile: null }

  const { data } = await supabase
    .from('club_members')
    .select('*')
    .eq('email', user.email ?? '')
    .maybeSingle()
  if (!data) return { status: 'not-found', profile: null }

  const row = data as Record<string, unknown>
  // Link user_id on the server if it is not linked yet (the browser can no
  // longer write club_members.user_id). Errors are ignored: email still matches.
  if (!row.user_id) fetch('/api/me/link-account', { method: 'POST' }).catch(() => {})

  const str = (k: string) => (typeof row[k] === 'string' ? (row[k] as string) : null)
  return {
    status: 'ok',
    profile: {
      full_name: str('full_name') ?? 'Member',
      role: str('role') ?? 'member',
      teams: Array.isArray(row.teams) ? (row.teams as string[]) : null,
      email: user.email ?? '',
      membership_expires_at: str('membership_expires_at'),
      member_id: str('member_id'),
      created_at: str('created_at'),
      id: str('id'),
      title: str('title'),
      phone: str('phone'),
      photo_url: str('photo_url'),
      linkedin_url: str('linkedin_url'),
      degree_programme: str('degree_programme'),
      study_level: str('study_level'),
      study_year: typeof row.study_year === 'number' ? row.study_year : null,
    },
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<Loaded>({ status: 'loading', profile: null })
  // Bumped when the tab comes back to the foreground, to refresh teams/role.
  const [visibleTick, setVisibleTick] = useState(0)

  // Load on mount, on every route change and when the tab is shown again, so
  // changes made by an admin (teams, role) show up without a manual reload.
  useEffect(() => {
    let cancelled = false
    loadProfile().then(next => {
      if (cancelled) return
      if (next.status === 'unauthenticated') router.push('/login')
      setState(next)
    })
    return () => { cancelled = true }
  }, [pathname, visibleTick, router])

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') setVisibleTick(n => n + 1) }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  if (state.status === 'loading') {
    return <div className="min-h-screen bg-ivory" aria-busy="true" />
  }
  if (state.status === 'unauthenticated') return null
  if (state.status === 'not-found' || !state.profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory px-6 text-night">
        <div className="max-w-[420px]">
          <p className="rd-display text-[40px]">Profile not found</p>
          <p className="mt-3 text-[15px] leading-[1.7] text-earth-700">
            Your account is not linked to a club member yet. Write to info@alatainvestmentclub.com.
          </p>
        </div>
      </div>
    )
  }

  const profile = state.profile
  return (
    <DashboardProfileProvider profile={profile}>
      <MemberShell profile={profile}>{children}</MemberShell>
    </DashboardProfileProvider>
  )
}
