import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import AlumniGrid from './AlumniGrid'
import AlumniReviewsWrapper from './AlumniReviewsWrapper'
import Reveal from '@/app/components/Reveal'
import Parallax from '@/app/components/Parallax'
import { MotionReveal, MotionLine } from '@/app/components/motion/Motion'
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
      .select('id, name, role, graduation_year, linkedin_url, current_company, industry, order_index')
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
        .select('id, name, role, graduation_year, linkedin_url, current_company, industry')
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
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Parallax>
          <Image
            src="/universita.jpg"
            alt=""
            fill
            className="object-cover grayscale animate-ken-burns"
            style={{ objectPosition: 'center 20%' }}
            preload
          />
        </Parallax>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="absolute inset-0 hero-vignette" />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <MotionReveal delay={0} y={20}>
              <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">
                <Link href="/team" className="hover:text-white/80 transition-colors">
                  Our Team
                </Link>
                {' / '}Alumni
              </p>
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
                Alumni
              </h1>
            </MotionReveal>
            <MotionLine delay={0.35} duration={0.8} className="w-12 h-px bg-white/30 mb-6" />
            <MotionReveal delay={0.45}>
              <p className="text-white/70 text-base max-w-2xl leading-relaxed">
                Former members who shaped Alata Investment Club — now building their careers in finance.
              </p>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {alumni.length === 0 ? (
            <p className="text-ink-500 text-sm text-center py-8">
              No alumni to display yet.
            </p>
          ) : (
            <AlumniGrid alumni={alumni} />
          )}
        </div>
      </section>

      {/* Where Our Alumni Work Today — marquee */}
      {companies.length > 0 && (
        <section className="py-16 bg-gray-100 border-t border-line overflow-hidden">
          <style>{`
            @keyframes alumni-companies-scroll {
              from { transform: translateX(0); }
              to   { transform: translateX(-50%); }
            }
            .alumni-companies-track {
              animation: alumni-companies-scroll 45s linear infinite;
            }
            .alumni-companies-viewport:hover .alumni-companies-track {
              animation-play-state: paused;
            }
            .alumni-companies-viewport {
              -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
              mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
            }
          `}</style>

          <Reveal direction="up" className="flex flex-col items-center mb-10">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Career Placements</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">
              Where Our Alumni Work Today
            </h2>
            <div className="w-10 h-px bg-forest mt-4" />
          </Reveal>

          <Reveal direction="up" delay={200}>
          <div className="alumni-companies-viewport overflow-hidden">
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
                        className="partner-logo-item h-12 w-auto object-contain max-w-[160px]"
                      />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="partner-logo-item h-12 w-auto object-contain max-w-[160px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          </Reveal>
        </section>
      )}

      <AlumniReviewsWrapper />
    </div>
  )
}
