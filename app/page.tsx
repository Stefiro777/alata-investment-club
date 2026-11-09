import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { ABOUT_STATS_KEY, parseAboutStats } from '@/lib/about-stats'
import { publicOnly, visiblePartners } from '@/lib/public-filters'
import { FLAGSHIP_CREDITS_KEY, parseFlagshipCredits, buildCredits } from '@/lib/flagship-credits'
import SiteNav from './components/site/SiteNav'
import SiteFooter from './components/site/SiteFooter'
import HomeScene, { type HomeEvent } from './components/home/HomeScene'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com' },
}

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: partners }, { data: statsRow }, { data: creditsRow }, { data: events }] = await Promise.all([
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
  ])

  const nextEvents = publicOnly(events as HomeEvent[] | null, e => e.title).slice(0, 4)
  const partnerNames = publicOnly(visiblePartners(partners), p => p.name).map(p => p.name as string)
  // The names that open the credits are edited in Board > Site > Settings; the partners follow.
  const credits = buildCredits(parseFlagshipCredits(creditsRow?.value), partnerNames)

  return (
    <>
      <HomeScene
        nav={<SiteNav tone="dark" bigLogo hideLogo inheritColor />}
        stats={parseAboutStats(statsRow?.value)}
        events={nextEvents}
        credits={credits}
      />
      <SiteFooter />
    </>
  )
}
