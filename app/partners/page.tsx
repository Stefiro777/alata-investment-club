import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import { publicOnly } from '@/lib/public-filters'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { VeiledMedia, ScrollProgress } from '@/app/components/site/Media'
import PartnerStories, { type PartnerStory } from './PartnerStories'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Partners — Alata Investment Club',
  description: 'The companies, institutions and communities that make our talks, visits and events possible.',
  alternates: { canonical: 'https://alatainvestmentclub.com/partners' },
}

type PartnerRow = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  description_long?: string | null
  type: string | null
}

export default async function PartnersPage() {
  const supabase = await createClient()
  // select('*') so the extended text (partners.description_long, SQL B) is
  // used as soon as the column exists, without breaking before.
  const { data } = await supabase
    .from('partners')
    .select('*')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const rows = publicOnly(data as PartnerRow[] | null, p => p.name)
  const items: PartnerStory[] = [
    ...rows.filter(r => r.type !== 'sponsor'),
    ...rows.filter(r => r.type === 'sponsor'),
  ].map(r => ({
    id: r.id,
    name: r.name,
    type: r.type === 'sponsor' ? 'sponsor' : 'partner',
    logo: r.logo_url,
    text: r.description_long?.trim() || r.description,
    website: r.website_url,
  }))

  return (
    <>
      {/* P1 · opening */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-pine text-ivory">
        <VeiledMedia image="/redesign/partners-hero.jpg" opacity={0.66} objectPosition="50% 42%" priority />
        <SiteNav tone="dark" />
        <div className="rd-gutter relative flex flex-1 flex-col justify-center pb-16 pt-28">
          <h1 className="rd-display text-[clamp(64px,11.3vw,136px)]">Partners<br /><em>&amp; Sponsors</em></h1>
          <p className="mt-10 max-w-[440px] text-[16px] leading-[1.7] text-ivory/[0.86]">
            The companies, institutions and communities that make our talks, visits and events possible.
          </p>
        </div>
      </section>

      {items.length > 0 ? (
        <PartnerStories items={items} />
      ) : (
        <section className="bg-ivory py-24 text-night">
          <p className="rd-gutter rd-italic text-[30px] text-earth-700">Our partners will appear here soon.</p>
        </section>
      )}

      {/* P3 · become a partner */}
      <section className="bg-pine px-6 py-[clamp(96px,14vw,180px)] text-center text-ivory">
        <h2 className="rd-display text-[clamp(56px,10vw,120px)]">Become a <em>partner</em></h2>
        <p className="mx-auto mt-8 max-w-[620px] text-[16px] leading-[1.7] text-ivory/[0.88]">
          Talks, company visits, research and events with 80+ students of the University of Brescia who are serious about finance.
        </p>
        <a href="mailto:info@alatainvestmentclub.com?subject=Partnership" className="rd-italic mt-10 inline-block text-[clamp(40px,4.3vw,52px)] hover:underline underline-offset-[0.18em]">
          Write to us
        </a>
        <div className="mt-4 text-[14px] text-ivory/80">info@alatainvestmentclub.com</div>
      </section>

      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
