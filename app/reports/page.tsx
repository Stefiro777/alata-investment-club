import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import type { FeaturedReport } from '@/lib/types'
import { ABOUT_STATS_KEY, parseAboutStats } from '@/lib/about-stats'
import { CLUB_LINKEDIN_POSTS, linkedInTitle, linkedInUrl } from '@/lib/linkedin'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { ScrollProgress } from '@/app/components/site/Media'
import ReportsArchive, { type ArchivePost } from './ReportsArchive'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Reports — Alata Investment Club',
  description: 'Reports and deal notes written by the members of the Alata Investment Club, from macro to M&A.',
  alternates: { canonical: 'https://alatainvestmentclub.com/reports' },
}

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
const fullDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

/** "A B, C D, E F, G H" → "B, D, F and 1 more" (surnames, as on board R2). */
function shortAuthors(authors: string | null, max = 3) {
  if (!authors) return null
  const names = authors.split(',').map(a => a.trim()).filter(Boolean)
  const surnames = names.map(n => n.split(/\s+/).slice(1).join(' ') || n)
  if (surnames.length <= max) return surnames.join(', ')
  return `${surnames.slice(0, max).join(', ')} and ${surnames.length - max} more`
}

/** The last two words of a long title go in italics ("The end of *cheap duration*"). */
function Headline({ title }: { title: string }) {
  const words = title.split(' ')
  if (words.length < 4) return <>{title}</>
  return <>{words.slice(0, -2).join(' ')} <em>{words.slice(-2).join(' ')}</em></>
}

/** Typographic cover: the featured reports are PDFs without an image. */
function Cover({ report, size }: { report: FeaturedReport; size: 'lg' | 'sm' }) {
  const lg = size === 'lg'
  if (report.image_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={report.image_url} alt="" className={`${lg ? 'aspect-[400/594]' : 'aspect-[190/270]'} w-full bg-moss object-cover`} />
    )
  }
  return (
    <div className={`relative ${lg ? 'aspect-[400/594]' : 'aspect-[190/270]'} w-full overflow-hidden bg-moss text-ivory`}>
      <div className={`rd-display absolute ${lg ? 'inset-x-7 top-7 text-[clamp(32px,3.8vw,46px)]' : 'inset-x-[13px] top-[13px] text-[clamp(18px,1.8vw,22px)]'}`}>
        {report.title}
      </div>
      <div className={`absolute ${lg ? 'bottom-6 left-7' : 'bottom-[11px] left-[13px]'} text-[10px] uppercase tracking-[0.14em] text-ivory/65`}>
        Alata Investment Club · {monthYear(report.created_at ?? new Date().toISOString())}
      </div>
    </div>
  )
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const [{ data: posts }, { data: featuredData }, { data: statsRow }] = await Promise.all([
    supabase
      .from('contenuti')
      .select('id, titolo, descrizione, data_pubblicazione, link')
      .eq('tipo', 'report')
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('featured_reports')
      .select('id, title, description, image_url, pdf_url, authors, display_order, created_at')
      .order('created_at', { ascending: false }),
    supabase.from('settings').select('value').eq('key', ABOUT_STATS_KEY).maybeSingle(),
  ])

  const featured = (featuredData ?? []) as FeaturedReport[]
  const [latest, ...others] = featured
  const analyses = parseAboutStats(statsRow?.value).find(s => /analys/i.test(s.label))?.value

  const archive: ArchivePost[] = (posts ?? []).map(p => ({
    id: p.id,
    date: p.data_pubblicazione,
    title: linkedInTitle(p.titolo) || linkedInTitle(p.descrizione ?? ''),
    url: p.link ? linkedInUrl(p.link) : null,
  })).filter(p => p.title)

  return (
    <>
      {/* R1 · the cover */}
      <section className="relative bg-ivory text-night">
        <SiteNav tone="light" />
        <div className="rd-gutter grid gap-12 pb-[clamp(64px,9vw,96px)] pt-[clamp(104px,12vw,96px)] md:grid-cols-[minmax(0,640px)_minmax(0,400px)] md:justify-between">
          <div>
            <h1 className="rd-display max-w-[640px] text-[clamp(44px,5.4vw,64px)]">What we think, <em>and why.</em></h1>
            <p className="mt-5 max-w-[560px] text-[15px] leading-[1.65] text-earth-700">
              Reports and deal notes written by our members, from macro to M&amp;A. Read the latest here, the rest below.
            </p>
            {latest ? (
              <article className="mt-[clamp(40px,6vw,72px)] border-t border-night pt-[22px]">
                <div className="text-[13px] text-earth-700">Latest report{latest.created_at ? ` · ${fullDate(latest.created_at)}` : ''}</div>
                <h2 className="rd-display mt-3 text-[clamp(42px,5.3vw,64px)]"><Headline title={latest.title} /></h2>
                {latest.description && <p className="mt-5 max-w-[560px] text-[14px] leading-[1.65] text-earth-700">{latest.description}</p>}
                {latest.authors && <p className="mt-3.5 text-[13px] text-earth-700">{latest.authors}</p>}
                {latest.pdf_url && (
                  <a href={latest.pdf_url} target="_blank" rel="noopener noreferrer" className="rd-italic mt-[26px] inline-block text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em]">
                    Read the report
                  </a>
                )}
              </article>
            ) : (
              <p className="rd-italic mt-16 text-[30px] text-earth-700">The next report is in the works.</p>
            )}
          </div>
          {latest && (
            <div className="mx-auto w-full max-w-[400px] md:mx-0 md:mt-1">
              <Cover report={latest} size="lg" />
            </div>
          )}
        </div>
      </section>

      {/* R2 · also in focus */}
      {others.length > 0 && (
        <section className="bg-night py-[clamp(72px,9vw,100px)] text-ivory">
          <div className="rd-gutter">
            <h2 className="rd-display text-[clamp(48px,6vw,72px)]">Also in <em>focus</em></h2>
            <div className="mt-10 grid gap-x-10 gap-y-14 md:mt-[52px] lg:grid-cols-2">
              {others.map(r => (
                <article key={r.id} className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-5 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-7">
                  <Cover report={r} size="sm" />
                  <div>
                    {r.created_at && <div className="text-[13px] text-ivory/75">{monthYear(r.created_at)}</div>}
                    <h3 className="rd-display mt-2 text-[clamp(26px,3vw,36px)]">{r.title}</h3>
                    {r.description && <p className="mt-3.5 line-clamp-4 text-[13px] leading-[1.6] text-ivory/[0.82]">{r.description}</p>}
                    {r.authors && <div className="mt-3 text-[12px] text-ivory/65">{shortAuthors(r.authors)}</div>}
                    {r.pdf_url && (
                      <a href={r.pdf_url} target="_blank" rel="noopener noreferrer" className="rd-italic mt-4 inline-block text-[32px] hover:underline underline-offset-[0.18em]">
                        Read
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* R3 · the archive */}
      <section className="bg-ivory py-[clamp(72px,9vw,110px)] text-night">
        <div className="rd-gutter">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="rd-display text-[clamp(48px,6vw,72px)]">The <em>archive</em></h2>
              <div className="mt-2 text-[14px] text-earth-700">
                {analyses ? `${analyses} analyses published on LinkedIn` : `${archive.length} posts on LinkedIn`}
              </div>
            </div>
            <a href={CLUB_LINKEDIN_POSTS} target="_blank" rel="noopener noreferrer" className="rd-italic text-[clamp(22px,2.3vw,28px)] hover:underline underline-offset-[0.18em]">
              All on LinkedIn
            </a>
          </div>
          <ReportsArchive posts={archive} />
        </div>
      </section>

      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
