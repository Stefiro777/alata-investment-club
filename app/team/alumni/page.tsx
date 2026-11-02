import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { LinkedInIcon } from '@/app/components/site/ui'
import { ScrollProgress } from '@/app/components/site/Media'
import LogoTrack, { type Company } from './LogoTrack'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Alumni — Alata Investment Club',
  description: 'Where the members of the Alata Investment Club went next.',
  alternates: { canonical: 'https://alatainvestmentclub.com/team/alumni' },
}

type AlumniRow = {
  id: string
  name: string
  role: string | null
  graduation_year: number | null
  linkedin_url: string | null
  current_company: string | null
  company: string | null
  photo_url: string | null
}

export default async function AlumniPage() {
  const supabase = await createClient()
  const { data: showAlumniRow } = await supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle()
  if (!showAlumniRow || showAlumniRow.value !== 'true') redirect('/team')

  const [{ data: alumniData }, { data: companiesData }] = await Promise.all([
    supabase
      .from('alumni')
      .select('id, name, role, graduation_year, linkedin_url, current_company, company, photo_url')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('alumni_companies')
      .select('id, name, logo_url, website_url')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  const alumni = (alumniData ?? []) as AlumniRow[]
  const seen = new Set<string>()
  const companies = ((companiesData ?? []) as Company[]).filter(c => {
    const k = c.name.trim().toLowerCase()
    if (!c.logo_url || seen.has(k)) return false
    seen.add(k)
    return true
  })
  const half = Math.ceil(companies.length / 2)

  return (
    <>
      {/* Al1 · opening */}
      <section className="relative overflow-hidden bg-pine text-ivory">
        <SiteNav tone="dark" />
        <div className="rd-gutter pb-[clamp(56px,8vw,80px)] pt-[clamp(104px,12vw,96px)]">
          <h1 className="rd-display max-w-[900px] text-[clamp(52px,8vw,96px)]">Where our members <em>went next.</em></h1>
          <div className="mt-8 flex flex-col gap-6 md:mt-10 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[420px] text-[15px] leading-[1.65] text-ivory/85">
              From the trading floor to the start-up, the people who began their careers here.
            </p>
            {alumni.length > 0 && (
              <a href="#alumni" className="rd-italic text-[clamp(30px,3vw,36px)] hover:underline underline-offset-[0.18em]">Meet them</a>
            )}
          </div>
        </div>
        {companies.length > 0 && (
          <div className="mt-[clamp(48px,7vw,72px)] space-y-5 bg-ivory py-7 md:space-y-6 md:py-9" aria-label="Companies where our alumni work">
            <LogoTrack companies={companies.slice(0, half)} direction="l" seconds={40} />
            <LogoTrack companies={companies.slice(half)} direction="r" seconds={46} />
          </div>
        )}
      </section>

      {/* Al2 · one by one */}
      <section id="alumni" className="scroll-mt-4 bg-ivory py-[clamp(64px,8vw,90px)] text-night">
        <div className="rd-gutter">
          <h2 className="rd-display text-[clamp(44px,4.7vw,56px)]">The <em>alumni</em></h2>
          {alumni.length === 0 ? (
            <p className="rd-italic mt-10 text-[26px] text-earth-700">The first alumni stories are on their way.</p>
          ) : (
            <ul className="mt-10 grid gap-x-7 gap-y-6 sm:grid-cols-2 md:mt-[22px] lg:grid-cols-4">
              {alumni.map(a => {
                const where = a.current_company || a.company
                return (
                  <li key={a.id} className="group flex items-start gap-3.5">
                    <div className="h-[112px] w-[84px] shrink-0 overflow-hidden bg-moss">
                      {a.photo_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.photo_url} alt={`Portrait of ${a.name}`} className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="rd-display text-[20px] leading-[1.1]">{a.name}</div>
                      {a.role && <div className="mt-1 line-clamp-2 text-[11px] leading-[1.35] text-earth-700">{a.role}</div>}
                      {where && <div className="mt-0.5 line-clamp-2 text-[11px] font-semibold leading-[1.35] text-club">{where}</div>}
                      <div className="mt-1.5 flex items-center gap-2.5 text-[10px] tracking-[0.06em] text-earth-500">
                        {a.graduation_year && <span>Class of {a.graduation_year}</span>}
                        {a.linkedin_url && (
                          <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`${a.name} on LinkedIn`} className="-m-2 p-2 leading-none text-night">
                            <LinkedInIcon size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
