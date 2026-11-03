'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Icons, type IconName } from './icons'

export type ShellProfile = {
  role: string
  teams: string[] | null
  email: string
}

const SUPERADMIN_EMAIL = 'finullistefano@gmail.com'

const MAIN: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: 'home' },
  { href: '/dashboard/career-resources', label: 'Career Resources', short: 'Career', icon: 'jobs' },
  { href: '/dashboard/calendar', label: 'Calendar', short: 'Calendar', icon: 'calendar' },
  { href: '/dashboard/members', label: 'People', short: 'People', icon: 'people' },
  { href: '/dashboard/profile', label: 'Profile', short: 'Profile', icon: 'profile' },
]

export const TEAM_LINKS: { slug: string; label: string; icon: IconName }[] = [
  { slug: 'events', label: 'Events', icon: 'events' },
  { slug: 'media', label: 'Media', icon: 'media' },
  { slug: 'career', label: 'Career', icon: 'career' },
]

export function isPrivilegedProfile(p: ShellProfile) {
  return p.role === 'bod' || p.role === 'director' || p.email === SUPERADMIN_EMAIL
}

/** Teams this member can open: their own, or all of them for BoD and Management. */
export function visibleTeams(p: ShellProfile) {
  if (isPrivilegedProfile(p)) return TEAM_LINKS
  const mine = p.teams ?? []
  return TEAM_LINKS.filter(t => mine.includes(t.slug))
}

function active(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(href + '/')
}

/**
 * Member area shell (boards area/*): dark sidebar on desktop, a fixed bar with
 * Home / Career / Calendar / People / Profile on mobile. On mobile the teams are
 * reached from the Dashboard.
 */
export default function MemberShell({ profile, children }: { profile: ShellProfile; children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMentor, setIsMentor] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const teams = visibleTeams(profile)
  const privileged = isPrivilegedProfile(profile)

  useEffect(() => {
    let cancelled = false
    fetch('/api/career/me')
      .then(r => r.json())
      .then(json => { if (!cancelled) setIsMentor(!!json.linked) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function logout() {
    setLoggingOut(true)
    await createClient().auth.signOut()
    router.push('/login')
  }

  const item = (href: string, label: string, icon: IconName) => {
    const on = active(pathname, href)
    const Icon = Icons[icon]
    return (
      <Link
        key={href}
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`flex items-center gap-3.5 px-6 py-3 font-serif text-[21px] font-medium transition-colors ${on ? 'bg-ivory/10 text-ivory' : 'text-ivory/70 hover:text-ivory'}`}
      >
        <Icon />
        {label}
      </Link>
    )
  }

  return (
    <div className="rd-app rd-member min-h-screen bg-ivory text-night">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] flex-col bg-night text-ivory lg:flex">
        <Link href="/" className="ml-6 mt-[26px] block w-fit leading-none" aria-label="Alata Investment Club, website">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-light.png" alt="Alata" className="h-10 w-auto" />
        </Link>
        <nav className="mt-[38px] flex-1 overflow-y-auto" aria-label="Member area">
          {MAIN.map(m => item(m.href, m.label, m.icon))}
          {teams.length > 0 && (
            <>
              <div className="rd-eyebrow px-6 pb-2 pt-[26px] text-[10px] text-ivory/45">Teams</div>
              {teams.map(t => item(`/dashboard/team/${t.slug}`, t.label, t.icon))}
            </>
          )}
          {(isMentor || privileged) && (
            <div className="mt-[26px] border-t border-ivory/10 pt-2">
              {isMentor && item('/dashboard/career/me', 'My mentor page', 'career')}
              {privileged && item('/admin', 'Board panel', 'tools')}
            </div>
          )}
        </nav>
        <div className="flex flex-col gap-3 px-6 pb-8 pt-6 text-[13px] text-ivory/70">
          <Link href="/" className="hover:text-ivory">Return to website</Link>
          <button type="button" onClick={logout} disabled={loggingOut} className="text-left hover:text-ivory disabled:opacity-50">
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between px-5 pt-5 lg:hidden">
        <Link href="/" aria-label="Alata Investment Club, website">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-dark.png" alt="Alata" className="h-[34px] w-auto" />
        </Link>
        <button type="button" onClick={logout} disabled={loggingOut} className="text-[13px]">
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </header>

      <main className="min-w-0 px-5 pb-[110px] pt-6 lg:ml-[230px] lg:px-12 lg:pb-16 lg:pt-11">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav aria-label="Member area" className="fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-center justify-around bg-night px-2 pb-2 text-ivory lg:hidden">
        {MAIN.map(m => {
          const on = active(pathname, m.href)
          const Icon = Icons[m.icon]
          return (
            <Link key={m.href} href={m.href} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center gap-[5px] text-[10px] tracking-[0.06em] ${on ? 'text-ivory' : 'text-ivory/55'}`}>
              <Icon />
              {m.short}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
