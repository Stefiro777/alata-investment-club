'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { MemberProfile } from './DashboardProfileContext'

const TEAM_ITEMS = [
  { label: 'Events',        slug: 'events' },
  { label: 'Media',         slug: 'media' },
  { label: 'Career',        slug: 'career' },
  { label: 'Education',     slug: 'education' },
  { label: 'Academy',       slug: 'academy' },
  { label: 'Syrto',         slug: 'syrto' },
  { label: 'Lab & Research', slug: 'lab' },
  { label: 'Alumni',        slug: 'alumni' },
]

export default function DashboardNav({ profile }: { profile: MemberProfile }) {
  const pathname = usePathname()
  const router = useRouter()
  const [teamOpen, setTeamOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isBoD = profile.role === 'bod' || profile.role === 'director' || profile.email === 'finullistefano@gmail.com'
  const canScan = isBoD || (profile.teams ?? []).some(t => t === 'events' || t === 'media')

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function linkClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return [
      'text-sm font-medium transition-colors pb-0.5 border-b-2',
      active
        ? 'text-white border-[#7ecba3]'
        : 'text-white/70 hover:text-white border-transparent',
    ].join(' ')
  }

  const teamActive = pathname.startsWith('/dashboard/team')

  return (
    <nav className="sticky top-0 z-[50] bg-[#1a4a3a] shadow-md">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center h-14 gap-4 md:gap-8">

        {/* Nav links — scrollable on mobile, normal on desktop */}
        <div className="flex items-center gap-6 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden md:overflow-visible">
          <Link href="/dashboard" className={`${linkClass('/dashboard', true)} whitespace-nowrap flex-shrink-0`}>
            Dashboard
          </Link>

          {isBoD && (
            <Link href="/dashboard/todo" className={`${linkClass('/dashboard/todo')} whitespace-nowrap flex-shrink-0`}>
              To Do
            </Link>
          )}

          <Link href="/dashboard/ideas" className={`${linkClass('/dashboard/ideas')} whitespace-nowrap flex-shrink-0`}>
            Idee
          </Link>

          {/* Team dropdown */}
          <div
            className="relative flex-shrink-0"
            onMouseEnter={() => setTeamOpen(true)}
            onMouseLeave={() => setTeamOpen(false)}
          >
            <button
              type="button"
              onClick={() => setTeamOpen(o => !o)}
              className={[
                'text-sm font-medium transition-colors pb-0.5 border-b-2 flex items-center gap-1 whitespace-nowrap',
                teamActive
                  ? 'text-white border-[#7ecba3]'
                  : 'text-white/70 hover:text-white border-transparent',
              ].join(' ')}
            >
              Team
              <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {teamOpen && (
              <div className="absolute top-full left-0 mt-0 bg-[#123a2d] min-w-[160px] shadow-lg py-1 z-50">
                {TEAM_ITEMS.map(item => (
                  <Link
                    key={item.slug}
                    href={`/dashboard/team/${item.slug}`}
                    onClick={() => setTeamOpen(false)}
                    className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-[#1a4a3a] transition-colors whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/dashboard/calendar" className={`${linkClass('/dashboard/calendar')} whitespace-nowrap flex-shrink-0`}>
            Calendario
          </Link>

          <Link href="/dashboard/members" className={`${linkClass('/dashboard/members')} whitespace-nowrap flex-shrink-0`}>
            Membri
          </Link>

          <Link href="/dashboard/jobs" className={`${linkClass('/dashboard/jobs')} whitespace-nowrap flex-shrink-0`}>
            Job Offers
          </Link>

          <Link href="/dashboard/resources" className={`${linkClass('/dashboard/resources')} whitespace-nowrap flex-shrink-0`}>
            Resources
          </Link>

          {isBoD && (
            <Link href="/dashboard/media/merch" className={`${linkClass('/dashboard/media/merch')} whitespace-nowrap flex-shrink-0`}>
              Merch
            </Link>
          )}

          {canScan && (
            <Link href="/dashboard/scanner" className={`${linkClass('/dashboard/scanner')} whitespace-nowrap flex-shrink-0`}>
              Scanner
            </Link>
          )}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-4 flex-shrink-0">
{isBoD && (
            <Link
              href="/admin"
              className="text-xs font-medium uppercase tracking-wide border border-white/40 hover:border-white text-white px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Admin Panel
            </Link>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-xs font-medium uppercase tracking-wide border border-white/40 hover:border-white text-white px-3 py-1.5 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loggingOut ? '…' : 'Logout'}
          </button>
        </div>

      </div>
    </nav>
  )
}
