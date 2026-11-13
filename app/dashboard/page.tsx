'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProfile, type MemberProfile } from './DashboardProfileContext'
import { visibleTeams, isPrivilegedProfile } from '@/app/components/member/MemberShell'
import { timeRange } from '@/lib/event-display'
import { DASHBOARD_QUOTES } from '@/lib/dashboard-quotes'
import { isPubliclyHidden } from '@/lib/public-filters'
import { Section, Row, FieldRow, Pill, ProgressRule } from '@/app/components/member/ui'

type NextEvent = {
  id: string; slug: string | null; title: string; date: string; status: string | null
  start_time: string | null; end_time: string | null; location: string | null; members_only: boolean | null
}
type Resource = { id: string; title: string; description: string | null; url: string | null; category: string | null; is_folder: boolean | null; audience?: string[] | null }
type RoleProfile = { reports_to: string | null; responsibilities: string[] | null }

const TEAM_LABEL: Record<string, string> = { events: 'Events', media: 'Media', career: 'Career', lab: 'Lab' }

function levelLabel(p: MemberProfile) {
  if (!p.study_level) return null
  const lvl = p.study_level === 'master' ? 'Master' : 'Bachelor'
  return p.study_year ? `${lvl}, year ${p.study_year}` : lvl
}

/**
 * The audience tags a member matches in resources.audience, general first.
 * A level with no year gets the level tag (plus the first-year starter set for
 * bachelors); no level at all gets the starter set.
 */
function audienceTags(level: string | null | undefined, year: number | null | undefined): string[] {
  if (level !== 'bachelor' && level !== 'master') return ['bachelor_1']
  if (year) return [level, `${level}_${year}`]
  return level === 'bachelor' ? [level, 'bachelor_1'] : [level]
}

/**
 * The line under the name, chosen by the server at every opening (/api/dashboard-quote).
 * Nothing is drawn on the server render, so there is no hydration mismatch; the line
 * keeps its height meanwhile, and falls back to the first phrase if the request fails.
 */
function DashboardQuote() {
  const [quote, setQuote] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/dashboard-quote', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('quote'))))
      .then(json => { if (!cancelled) setQuote(String(json.quote)) })
      .catch(() => { if (!cancelled) setQuote(DASHBOARD_QUOTES[0]) })
    return () => { cancelled = true }
  }, [])
  return (
    <p className={`rd-italic mt-6 min-h-[1.3em] text-[clamp(24px,2.5vw,28px)] transition-opacity duration-500 ${quote ? 'opacity-100' : 'opacity-0'}`} aria-live="polite">
      {quote ?? DASHBOARD_QUOTES[0]}
    </p>
  )
}

/** What the profile already holds, out of seven fields. */
function profileFields(p: MemberProfile) {
  return [
    { label: 'Email', value: p.email, source: 'From application' },
    { label: 'Phone', value: p.phone, source: 'From application' },
    { label: 'Degree', value: p.degree_programme, source: 'From application' },
    { label: 'Year', value: levelLabel(p), source: 'From application' },
    { label: 'Photo', value: p.photo_url ? 'Added' : null, source: null },
    { label: 'LinkedIn', value: p.linkedin_url ? p.linkedin_url.replace(/^https?:\/\/(www\.)?/, '') : null, source: null },
  ]
}

function MembershipNotice({ profile }: { profile: MemberProfile }) {
  const params = useSearchParams()
  const flag = params.get('membership')
  const exp = profile.membership_expires_at ? new Date(profile.membership_expires_at) : null
  const [now] = useState(() => Date.now())
  const days = exp ? Math.floor((exp.getTime() - now) / 86_400_000) : null

  let text: string | null = null
  if (flag === 'removed') text = 'You are no longer part of the membership. For information, write to the Board.'
  else if (flag === 'expired' || (days !== null && days < 0)) text = 'Your membership has expired. Renew it to open the rest of the area.'
  else if (days !== null && days <= 30) text = `Your membership expires on ${exp!.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.`
  if (!text) return null
  return (
    <div role="status" className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-night/20 py-4">
      <p className="text-[14px]">{text}</p>
      {flag !== 'removed' && <Link href="/dashboard/membership" className="rd-italic text-[22px] text-club hover:underline underline-offset-[0.18em]">Renew</Link>}
    </div>
  )
}

export default function DashboardPage() {
  const profile = useProfile()!
  const [next, setNext] = useState<NextEvent | null | undefined>(undefined)
  const [resources, setResources] = useState<Resource[]>([])
  const [role, setRole] = useState<RoleProfile | null>(null)

  const firstTeam = (profile.teams ?? []).find(t => TEAM_LABEL[t]) ?? null
  const level = levelLabel(profile)
  const canManageEvents = visibleTeams(profile).some(t => t.slug === 'events')

  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    let cancelled = false

    supabase
      .from('upcoming_events')
      .select('id, slug, title, date, status, start_time, end_time, location, members_only')
      .gte('date', today)
      .neq('status', 'completed')
      .order('date', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        if (cancelled) return
        const list = ((data ?? []) as NextEvent[]).filter(e => !isPubliclyHidden(e.title))
        setNext(list[0] ?? null)
      })

    supabase
      .from('resources')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        // Folders count: most of the material lives in Drive folders.
        const rows = ((data ?? []) as Resource[]).filter(r => r.url)
        const tags = audienceTags(profile.study_level, profile.study_year)
        // resources.audience targets a year of study ("bachelor", "bachelor_2", "master"…).
        // The most general tag comes first, so a guide meant for the whole level leads the list.
        const rank = (r: Resource) => Math.min(...(r.audience ?? []).map(a => tags.indexOf(a)).filter(i => i >= 0))
        const targeted = rows.filter(r => r.audience?.some(a => tags.includes(a))).sort((a, b) => rank(a) - rank(b))
        // Until something is tagged: one guide per area, master, career, learning.
        const picks = targeted.length > 0
          ? targeted
          : (['masters', 'career', 'education'] as const).map(c => rows.find(r => r.category === c && !r.is_folder)).filter(Boolean) as Resource[]
        setResources(picks.slice(0, 4))
      })

    if (firstTeam && profile.title) {
      // role_profiles (SQL E) may not exist yet: any error just hides the block.
      supabase
        .from('role_profiles')
        .select('reports_to, responsibilities')
        .eq('team', firstTeam)
        .eq('title', profile.title)
        .maybeSingle()
        .then(({ data, error }) => { if (!cancelled && !error && data) setRole(data as RoleProfile) })
    }
    return () => { cancelled = true }
  }, [firstTeam, profile.title, profile.study_level, profile.study_year])

  const fields = profileFields(profile)
  const filled = 1 + fields.filter(f => f.value).length // the name is always there
  const roleLine = [profile.title, firstTeam ? TEAM_LABEL[firstTeam] : isPrivilegedProfile(profile) ? (profile.role === 'bod' ? 'Board of Directors' : 'Management') : null].filter(Boolean).join(' · ')

  return (
    <>
      <Suspense fallback={null}><MembershipNotice profile={profile} /></Suspense>

      <div className="flex items-start gap-5">
        <div className="h-[82px] w-[64px] shrink-0 overflow-hidden bg-sand">
          {profile.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="rd-display text-[clamp(34px,4vw,44px)]">{profile.full_name}</h1>
          {roleLine && <div className="rd-italic mt-1 text-[18px] text-earth-700">{roleLine}</div>}
        </div>
      </div>
      <DashboardQuote />

      {/* Next event */}
      {next === undefined ? (
        <div className="mt-7 h-[165px] bg-pine/90" aria-busy="true" />
      ) : next ? (
        <div className="mt-7 grid gap-5 bg-pine px-6 py-6 text-ivory md:grid-cols-[150px_minmax(0,1fr)_auto] md:items-center md:gap-7 md:px-9 md:py-[26px]">
          <div>
            <div className="rd-eyebrow mb-3 text-[11px] text-ivory/70 md:hidden">Next event</div>
            <div className="font-serif text-[72px] font-medium leading-none">{String(new Date(next.date + 'T00:00:00').getDate()).padStart(2, '0')}</div>
            <div className="rd-eyebrow mt-3.5 text-[11px] text-ivory/75">{new Date(next.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long' })}</div>
          </div>
          <div className="min-w-0">
            <div className="rd-eyebrow hidden text-[11px] text-ivory/70 md:block">Next event</div>
            <div className="rd-display mt-2 text-[clamp(26px,2.7vw,32px)]">{next.title}</div>
            <div className="mt-2 text-[14px] text-ivory/85">{[timeRange(next.start_time, next.end_time), next.location].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {next.members_only && <Pill tone="dark">Members only</Pill>}
            {next.status === 'open' && next.slug ? (
              <Link href={`/events/${next.slug}#register`} className="rd-italic text-[28px] hover:underline underline-offset-[0.18em]">Register</Link>
            ) : (
              <Pill tone="dark">Soon</Pill>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-7 bg-pine px-9 py-8 text-ivory">
          <p className="rd-italic text-[26px]">New dates are on their way.</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Pill href="/events" solid>All events</Pill>
        {canManageEvents && <Pill href="/dashboard/team/events">Manage events</Pill>}
        <Pill href="/dashboard/calendar">My calendar</Pill>
      </div>

      {/* Teams, on mobile (the desktop sidebar already lists them) */}
      {visibleTeams(profile).length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2.5 lg:hidden">
          {visibleTeams(profile).map(t => <Pill key={t.slug} href={`/dashboard/team/${t.slug}`}>{t.label} team</Pill>)}
        </div>
      )}

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title="Getting started" meta={level ? `For you · ${level}` : 'For you'}>
          {resources.length === 0 ? (
            <p className="py-4 text-[13px] text-earth-600">Guides appear here as the Career team adds them.</p>
          ) : resources.map(r => (
            <Row key={r.id} title={r.title} detail={r.description} href={r.url ?? undefined} external action="Open" />
          ))}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <Link href="/dashboard/career-resources#resources" className="rd-italic text-[20px] hover:underline underline-offset-[0.18em]">All resources</Link>
            {!profile.study_year && (
              <Link href="/dashboard/profile" className="rd-italic text-[20px] text-club hover:underline underline-offset-[0.18em]">Add your year to see guides for you</Link>
            )}
          </div>
        </Section>

        <Section title="Your profile" meta={`${filled} of 7`} after={<ProgressRule value={filled / 7} />}>
          {fields.map(f => (
            <FieldRow
              key={f.label}
              label={f.label}
              value={f.value ?? 'Not added'}
              muted={!f.value}
              aside={f.value ? f.source : <Link href="/dashboard/profile" className="rd-italic text-[20px] hover:underline">Add</Link>}
            />
          ))}
        </Section>
      </div>

      {role && role.responsibilities && role.responsibilities.length > 0 && (
        <Section title="Your role" meta={[profile.title, role.reports_to ? `reports to ${role.reports_to}` : null].filter(Boolean).join(' · ')}>
          <ul>
            {role.responsibilities.map(r => (
              <li key={r} className="relative border-b border-night/15 py-[9px] pl-[18px] text-[13px] leading-[1.5] before:absolute before:left-0 before:top-[17px] before:h-px before:w-1.5 before:bg-club">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}
