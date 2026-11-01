import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { publicOnly } from '@/lib/public-filters'
import { dayNumber, eventKind, shortPlace } from '@/lib/event-display'
import type { FeaturedGalleryItem } from '@/lib/types'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { StatusPill } from '@/app/components/site/ui'
import { ScrollProgress } from '@/app/components/site/Media'
import StoriesSection, { type Story } from './StoriesSection'
import ArchiveSection, { type ArchiveItem } from './ArchiveSection'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events — Alata Investment Club',
  description: 'Career talks, company visits and days inside the exchange with the Alata Investment Club.',
}

type EventRow = {
  id: string
  slug: string | null
  title: string
  date: string
  status: string | null
  location: string | null
}

type CardRow = {
  id: number
  titolo: string
  descrizione: string | null
  full_description: string | null
  data_pubblicazione: string | null
  immagine_url: string | null
  photos: string[] | null
  tag: string | null
  link: string | null
}

/** Strips "Company Visit at", "w/" and similar so a story can find its event. */
function storyKey(title: string) {
  return title.toLowerCase().replace(/company visit (at|@|w\/)|inside the markets|w\//g, ' ').replace(/\s+/g, ' ').trim()
}

export default async function EventsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: eventRows }, { data: featured }, { data: cards }, { data: images }] = await Promise.all([
    supabase.from('upcoming_events').select('id, slug, title, date, status, location').order('date', { ascending: true }),
    supabase.from('featured_events').select('id, title, description, authors, media, display_order').order('display_order', { ascending: true }),
    supabase
      .from('contenuti')
      .select('id, titolo, descrizione, full_description, data_pubblicazione, immagine_url, photos, tag, link')
      .eq('tipo', 'evento')
      .order('data_pubblicazione', { ascending: false }),
    supabase.from('event_images').select('event_id, url, display_order').order('display_order', { ascending: true }),
  ])

  const events = publicOnly(eventRows as EventRow[] | null, e => e.title)
  const firstPhoto = new Map<string, string>()
  for (const img of images ?? []) if (!firstPhoto.has(img.event_id)) firstPhoto.set(img.event_id, img.url)

  // ── Timeline: what comes next, grouped by month (only months with events) ──
  const upcoming = events.filter(e => e.date >= today && e.status !== 'completed')
  const months: { key: string; month: string; year: string; items: EventRow[] }[] = []
  for (const e of upcoming) {
    const d = new Date(e.date + 'T00:00:00')
    const key = e.date.slice(0, 7)
    let m = months.find(x => x.key === key)
    if (!m) {
      m = { key, month: d.toLocaleDateString('en-GB', { month: 'long' }), year: String(d.getFullYear()), items: [] }
      months.push(m)
    }
    m.items.push(e)
  }

  // ── Stories: the featured events, each tied to its published event ──
  const past = events.filter(e => e.date < today || e.status === 'completed')
  const stories: Story[] = ((featured ?? []) as FeaturedGalleryItem[]).map(f => {
    const key = storyKey(f.title)
    const match = past.find(e => storyKey(e.title).includes(key) || key.includes(storyKey(e.title)))
    const meta = match
      ? [new Date(match.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), shortPlace(match.location)].filter(Boolean).join(' · ')
      : null
    return {
      id: f.id,
      label: f.title.replace(/^company visit (at|@)\s*/i, ''),
      title: match?.title.replace(/\s{2,}/g, ' ') ?? f.title,
      meta,
      description: f.description,
      photos: (f.media ?? []).filter(m => m.type === 'image').map(m => m.url),
      film: (f.media ?? []).find(m => m.type === 'video')?.url ?? null,
    }
  })

  // ── Archive: every past event that is not a story, newest first ──
  const storyEventTitles = new Set(stories.map(s => s.title))
  const archive: ArchiveItem[] = [
    ...past
      .filter(e => !storyEventTitles.has(e.title.replace(/\s{2,}/g, ' ')))
      .map(e => ({
        key: `e-${e.id}`,
        date: e.date,
        title: e.title,
        kind: eventKind(e.title),
        photo: firstPhoto.get(e.id) ?? null,
        href: e.slug ? `/events/${e.slug}` : null,
      })),
    ...publicOnly(cards as CardRow[] | null, c => c.titolo)
      .filter(c => c.data_pubblicazione)
      .map(c => {
        const photos = (c.photos && c.photos.length ? c.photos : c.immagine_url ? [c.immagine_url] : []) as string[]
        return {
          key: `c-${c.id}`,
          date: c.data_pubblicazione as string,
          title: c.titolo,
          kind: eventKind(c.titolo, c.tag),
          photo: photos[0] ?? null,
          href: c.link && /^https?:\/\//.test(c.link) ? null : c.link,
          description: c.full_description || c.descrizione,
          photos,
        }
      }),
  ].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <div className="relative bg-ivory text-night">
        <SiteNav tone="light" />
        <section className="rd-gutter pb-[clamp(64px,9vw,100px)] pt-[clamp(104px,12vw,96px)]">
          <h1 className="rd-display text-[clamp(44px,5.4vw,64px)]">Where the club <em>meets the markets.</em></h1>
          <p className="mt-5 max-w-[600px] text-[15px] leading-[1.65] text-earth-700">
            Career talks with founders and CEOs, visits to the companies behind the headlines, days inside the exchange. Here is what comes next.
          </p>

          {months.length === 0 ? (
            <p className="rd-italic mt-16 text-[clamp(28px,3vw,36px)] text-earth-700">New dates are on their way.</p>
          ) : (
            <div className="mt-[clamp(48px,6vw,80px)] space-y-[clamp(44px,5vw,56px)]">
              {months.map(m => (
                <div key={m.key} className="grid gap-4 md:grid-cols-[minmax(0,380px)_minmax(0,684px)] md:justify-between md:gap-6">
                  <div>
                    <div className="rd-italic text-[clamp(56px,7vw,84px)] leading-[1.1]">{m.month}</div>
                    <div className="mt-1.5 text-[12px] text-earth-500">
                      {m.year} · {m.items.length} {m.items.length === 1 ? 'event' : 'events'}
                    </div>
                  </div>
                  <ul className="border-t border-night md:mt-1.5">
                    {m.items.map(e => {
                      const kind = eventKind(e.title)
                      const place = shortPlace(e.location)
                      const sub = [kind, place].filter(Boolean).join(' · ')
                      return (
                        <li key={e.id}>
                          <Link
                            href={e.slug ? `/events/${e.slug}` : '#'}
                            className="grid min-h-[72px] grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3 transition-colors hover:bg-night/[0.03] md:grid-cols-[84px_minmax(0,1fr)_120px] md:gap-x-5"
                          >
                            <span className="rd-display text-[clamp(34px,3.5vw,42px)] leading-none">{dayNumber(e.date)}</span>
                            <span className="min-w-0">
                              <span className="block text-[16px] leading-[1.3] md:text-[18px]">{e.title}</span>
                              {sub && <span className="mt-1 block text-[12px] text-earth-500">{sub}</span>}
                            </span>
                            <span className="justify-self-end">
                              <StatusPill solid={e.status === 'open'}>{e.status === 'open' ? 'Open' : 'Soon'}</StatusPill>
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {(stories.length > 0 || archive.length > 0) && (
            <Link
              href={stories.length > 0 ? '#stories' : '#archive'}
              className="rd-italic mt-[clamp(48px,6vw,72px)] inline-block text-[30px] hover:underline underline-offset-[0.18em]"
            >
              Past events and stories
            </Link>
          )}
        </section>
      </div>

      {stories.length > 0 && <StoriesSection stories={stories} />}
      <ArchiveSection items={archive} />
      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
