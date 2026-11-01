import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { ABOUT_STATS_KEY, parseAboutStats } from '@/lib/about-stats'
import { publicOnly } from '@/lib/public-filters'
import SiteNav from './components/site/SiteNav'
import SiteFooter from './components/site/SiteFooter'
import HomeScene, { type HomeEvent } from './components/home/HomeScene'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com' },
}

// The hosts of the club's flagship days open the credits, then the partners.
const FLAGSHIP_CREDITS = ['Private Banker Day', 'Borsa Italiana', 'EssilorLuxottica', 'Bellini Nautica Group']

export default async function HomePage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: partners }, { data: statsRow }, { data: events }] = await Promise.all([
    supabase
      .from('partners')
      .select('name, order_index')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase.from('settings').select('value').eq('key', ABOUT_STATS_KEY).maybeSingle(),
    supabase
      .from('upcoming_events')
      .select('id, slug, title, date, status')
      .gte('date', today)
      .neq('status', 'completed')
      .order('date', { ascending: true })
      .limit(8),
  ])

  const nextEvents = publicOnly(events as HomeEvent[] | null, e => e.title).slice(0, 4)
  const partnerNames = publicOnly(partners, p => p.name).map(p => p.name as string)
  const credits = [...FLAGSHIP_CREDITS, ...partnerNames.filter(n => !FLAGSHIP_CREDITS.includes(n))]

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
