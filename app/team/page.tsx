import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { LinkedInIcon } from '@/app/components/site/ui'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Team — Alata Investment Club',
  description: 'The Board of the Alata Investment Club.',
  alternates: { canonical: 'https://alatainvestmentclub.com/team' },
}

type TeamMember = {
  id: string
  name: string
  role: string | null
  photo_url: string | null
  linkedin_url: string | null
  type: string
  order_index: number | null
}

function Person({ m }: { m: TeamMember }) {
  return (
    <li className="group flex items-end gap-[18px]">
      <div className="h-[132px] w-[100px] shrink-0 overflow-hidden bg-moss">
        {m.photo_url && (
          // One tone for every portrait; colour comes back on hover.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.photo_url}
            alt={`Portrait of ${m.name}`}
            className="h-full w-full object-cover grayscale contrast-[1.05] transition-[filter] duration-500 group-hover:grayscale-0 group-focus-within:grayscale-0"
            loading="lazy"
          />
        )}
      </div>
      <div className="min-w-0">
        <div className="rd-display text-[26px] leading-[1.1]">{m.name}</div>
        {m.role && <div className="mt-[5px] text-[12px] leading-[1.4] text-ivory/75">{m.role}</div>}
        {m.linkedin_url && (
          <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" aria-label={`${m.name} on LinkedIn`} className="-m-2 mt-0.5 inline-block p-2 leading-none text-ivory/80 hover:text-ivory">
            <LinkedInIcon />
          </a>
        )}
      </div>
    </li>
  )
}

export default async function TeamPage() {
  const supabase = await createClient()
  const [{ data: alumniSetting }, { data }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
    supabase
      .from('team_members')
      .select('id, name, role, photo_url, linkedin_url, type, order_index')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])
  const members = (data ?? []) as TeamMember[]
  const bod = members.filter(m => m.type === 'bod')
  const management = members.filter(m => m.type === 'management')
  const showAlumni = alumniSetting?.value !== 'false'

  return (
    <>
      <section className="relative min-h-[100svh] bg-night text-ivory">
        <SiteNav tone="dark" />
        <div className="rd-gutter pb-20 pt-[clamp(104px,12vw,92px)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h1 className="rd-display text-[clamp(60px,7.7vw,92px)]">The <em>Board</em></h1>
            <p className="max-w-[260px] text-[14px] leading-[1.65] text-ivory/85 md:pb-4 md:text-right">
              The {bod.length === 9 ? 'nine' : bod.length} people who run the club.
            </p>
          </div>

          {bod.length > 0 ? (
            <ul className="mt-12 grid gap-x-8 gap-y-[30px] sm:grid-cols-2 md:mt-[46px] lg:grid-cols-3">
              {bod.map(m => <Person key={m.id} m={m} />)}
            </ul>
          ) : (
            <p className="rd-italic mt-16 text-[28px] text-ivory/70">The new Board is being announced.</p>
          )}

          {management.length > 0 && (
            <>
              <h2 className="rd-display mt-20 text-[clamp(40px,5vw,56px)]"><em>Management</em></h2>
              <ul className="mt-8 grid gap-x-8 gap-y-[30px] sm:grid-cols-2 lg:grid-cols-3">
                {management.map(m => <Person key={m.id} m={m} />)}
              </ul>
            </>
          )}

          {showAlumni && (
            <Link href="/team/alumni" className="rd-italic mt-16 inline-block text-[clamp(28px,3vw,36px)] hover:underline underline-offset-[0.18em]">
              Where our members went next
            </Link>
          )}
        </div>
      </section>
      <SiteFooter />
    </>
  )
}
