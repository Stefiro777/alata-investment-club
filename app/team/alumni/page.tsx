import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AlumniGrid from './AlumniGrid'
import type { Alumni } from '@/lib/types'

export const dynamic = 'force-dynamic'


type AlumniCompany = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
}


export default async function AlumniPage() {
  const supabase = await createClient()

  const { data: showAlumniRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'show_alumni')
    .maybeSingle()

  if (!showAlumniRow || showAlumniRow.value !== 'true') {
    redirect('/team')
  }

  const [{ data: alumniData, error: alumniError }, { data: companiesData }] = await Promise.all([
    supabase
      .from('alumni')
      .select('id, name, role, graduation_year, linkedin_url, current_company, order_index')
      .order('created_at', { ascending: false }),
    supabase
      .from('alumni_companies')
      .select('id, name, logo_url, website_url')
      .order('created_at', { ascending: false }),
  ])

  // Fallback if order_index column doesn't exist yet (migration not yet run)
  const alumniList = alumniError
    ? (await supabase
        .from('alumni')
        .select('id, name, role, graduation_year, linkedin_url, current_company')
        .order('created_at', { ascending: false })).data
    : alumniData

  const alumni = (alumniList ?? []) as Alumni[]
  const companies = (companiesData ?? []) as AlumniCompany[]

  // Duplicate list enough times for a seamless loop (at least 8 items in the track)
  const minRepeat = companies.length > 0 ? Math.ceil(8 / companies.length) : 1
  const marqueeItems = Array.from({ length: minRepeat * 2 }, () => companies).flat()

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] text-white flex items-center overflow-hidden">
        <Image
          src="/universita.jpg"
          alt=""
          fill
          className="object-cover grayscale"
          style={{ objectPosition: 'center 20%' }}
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">
              <Link href="/team" className="hover:text-white/80 transition-colors">
                Our Team
              </Link>
              {' / '}Alumni
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Alumni
            </h1>
            <div className="w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Former members who shaped Alata Investment Club — now building their careers in finance.
            </p>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {alumni.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-8">
              No alumni to display yet.
            </p>
          ) : (
            <AlumniGrid alumni={alumni} />
          )}
        </div>
      </section>

      {/* Where Our Alumni Work Today — marquee */}
      {companies.length > 0 && (
        <section className="py-16 bg-[#f5f5f5] border-t border-[#e5e5e5] overflow-hidden">
          <style>{`
            @keyframes alumni-companies-scroll {
              from { transform: translateX(0); }
              to   { transform: translateX(-50%); }
            }
            .alumni-companies-track {
              animation: alumni-companies-scroll 30s linear infinite;
            }
          `}</style>

          <div className="flex flex-col items-center mb-10">
            <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">Career Placements</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a]">
              Where Our Alumni Work Today
            </h2>
            <div className="w-10 h-px bg-[#1a4a3a] mt-4" />
          </div>

          <div className="overflow-hidden">
            <div className="alumni-companies-track flex items-center w-max">
              {marqueeItems.map((company, i) => (
                <div key={i} className="mx-12 h-16 flex items-center">
                  {company.website_url ? (
                    <a
                      href={company.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={company.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="h-12 w-auto object-contain max-w-[160px]"
                      />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="h-12 w-auto object-contain max-w-[160px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
