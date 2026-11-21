import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { ABOUT_STATS_KEY, parseAboutStats } from '@/lib/about-stats'
import { publicOnly, visiblePartners } from '@/lib/public-filters'
import { FLAGSHIP_CREDITS_KEY, parseFlagshipCredits, buildCredits } from '@/lib/flagship-credits'
import SiteNav from './components/site/SiteNav'
import SiteFooter from './components/site/SiteFooter'
import { isEventFull } from '@/lib/event-capacity'
import type { EventAvailability } from '@/lib/types'
import AboutSections, { type HomeEvent } from './components/home/AboutSections'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com' },
}

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: partners }, { data: statsRow }, { data: creditsRow }, { data: events }, { data: availability }] = await Promise.all([
    supabase
      .from('partners')
      .select('name, order_index, is_hidden')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase.from('settings').select('value').eq('key', ABOUT_STATS_KEY).maybeSingle(),
    supabase.from('settings').select('value').eq('key', FLAGSHIP_CREDITS_KEY).maybeSingle(),
    supabase
      .from('upcoming_events')
      .select('id, slug, title, date, status')
      .gte('date', today)
      .neq('status', 'completed')
      .order('date', { ascending: true })
      .limit(8),
    supabase.rpc('get_event_availability'),
  ])

  const availabilityById = new Map(((availability ?? []) as EventAvailability[]).map(a => [a.event_id, a]))
  const nextEvents = publicOnly(events as HomeEvent[] | null, e => e.title)
    .slice(0, 4)
    .map(e => ({ ...e, full: isEventFull(e, availabilityById.get(e.id), today) }))
  const partnerNames = publicOnly(visiblePartners(partners), p => p.name).map(p => p.name as string)
  // The names that open the credits are edited in Board > Site > Settings; the partners follow.
  const credits = buildCredits(parseFlagshipCredits(creditsRow?.value), partnerNames)

  return (
    <>
      <AboutSections
        nav={<SiteNav tone="dark" bigLogo />}
        stats={parseAboutStats(statsRow?.value)}
        events={nextEvents}
        credits={credits}
      />
      <SiteFooter />
    </>
  )
}
