'use client'

import { useState, useEffect, useRef } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileTeamOpen, setMobileTeamOpen] = useState(false)
  const teamMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!teamOpen) return
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (teamMenuRef.current && !teamMenuRef.current.contains(e.target as Node)) {
        setTeamOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [teamOpen])

  // Collapse the mobile drawer's Team accordion whenever the drawer itself closes.
  useEffect(() => {
    if (!mobileOpen) setMobileTeamOpen(false)
  }, [mobileOpen])

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

  function mobileLinkClass(href: string, exact = false) {
    const active = exact ? pathname === href : pathname.startsWith(href)
    return [
      'min-h-[44px] flex items-center px-6 border-b border-white/10 border-l-2 text-sm font-medium transition-colors',
      active
        ? 'text-white border-l-[#7ecba3] bg-white/5'
        : 'text-white/80 border-l-transparent hover:text-white',
    ].join(' ')
  }

  const teamActive = pathname.startsWith('/dashboard/team')

  return (
    <nav className="sticky top-0 z-[50] bg-forest shadow-md">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center h-14 gap-4 md:gap-8">

        {/* Desktop nav links — unchanged, hidden on mobile */}
        <div className="hidden md:flex items-center gap-6 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden md:overflow-visible">
          <Link href="/dashboard" className={`${linkClass('/dashboard', true)} whitespace-nowrap flex-shrink-0`}>
            Dashboard
          </Link>

          <Link href="/dashboard/ideas" className={`${linkClass('/dashboard/ideas')} whitespace-nowrap flex-shrink-0`}>
            Idee
          </Link>

          {/* Team dropdown */}
          <div
            ref={teamMenuRef}
            className="relative flex-shrink-0"
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
                    className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-forest transition-colors whitespace-nowrap"
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

          {canScan && (
            <Link href="/dashboard/scanner" className={`${linkClass('/dashboard/scanner')} whitespace-nowrap flex-shrink-0`}>
              Scanner
            </Link>
          )}
        </div>

        {/* User + logout — unchanged, hidden on mobile (moved into the drawer there) */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0">
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

        {/* Mobile hamburger trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          className="md:hidden ml-auto text-white/80 hover:text-white p-2 transition-colors flex-shrink-0"
          aria-label={mobileOpen ? 'Chiudi menu' : 'Apri menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 top-14 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed top-14 right-0 bottom-0 w-[80%] max-w-xs bg-forest z-50 overflow-y-auto md:hidden shadow-2xl flex flex-col">
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard', true)}>
              Dashboard
            </Link>

            <Link href="/dashboard/ideas" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard/ideas')}>
              Idee
            </Link>

            {/* Team accordion */}
            <div className="border-b border-white/10">
              <button
                type="button"
                onClick={() => setMobileTeamOpen(o => !o)}
                className={[
                  'w-full min-h-[44px] flex items-center justify-between px-6 border-l-2 text-sm font-medium transition-colors',
                  teamActive ? 'text-white border-l-[#7ecba3] bg-white/5' : 'text-white/80 border-l-transparent hover:text-white',
                ].join(' ')}
                aria-expanded={mobileTeamOpen}
              >
                Team
                <svg
                  className="w-3.5 h-3.5 transition-transform"
                  style={{ transform: mobileTeamOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {mobileTeamOpen && (
                <div className="pb-1">
                  {TEAM_ITEMS.map(item => (
                    <Link
                      key={item.slug}
                      href={`/dashboard/team/${item.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="min-h-[44px] flex items-center pl-10 pr-6 text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link href="/dashboard/calendar" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard/calendar')}>
              Calendario
            </Link>

            <Link href="/dashboard/members" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard/members')}>
              Membri
            </Link>

            <Link href="/dashboard/jobs" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard/jobs')}>
              Job Offers
            </Link>

            <Link href="/dashboard/resources" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard/resources')}>
              Resources
            </Link>

            {canScan && (
              <Link href="/dashboard/scanner" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/dashboard/scanner')}>
                Scanner
              </Link>
            )}

            {isBoD && (
              <Link href="/admin" onClick={() => setMobileOpen(false)} className={mobileLinkClass('/admin')}>
                Admin Panel
              </Link>
            )}

            <button
              type="button"
              onClick={() => { setMobileOpen(false); handleLogout() }}
              disabled={loggingOut}
              className="min-h-[44px] flex items-center px-6 border-l-2 border-l-transparent text-sm font-medium text-white/80 hover:text-white transition-colors text-left disabled:opacity-50"
            >
              {loggingOut ? '…' : 'Logout'}
            </button>
          </div>
        </>
      )}
    </nav>
  )
}
