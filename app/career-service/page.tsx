//
import type { Metadata } from 'next'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-server'
import Reveal from '../components/Reveal'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/career-service' },
}

// -----------------------------------------------------------------------
// EDIT HERE: update Calendly links and Linktree URL
// -----------------------------------------------------------------------
const LINKTREE_URL = 'https://linktr.ee/alatainvestmentclub'

const services = [
  {
    id: 'cv-review',
    number: '01',
    title: 'CV Review',
    description:
      'Receive detailed, personalised feedback on your CV from our members with hands-on experience in finance, banking, and consulting. We help you craft a compelling, competitive curriculum that stands out to top recruiters.',
    price: '€29,99',
    calendlyUrl: 'https://calendly.com/alatabrixiaic/30min',
    features: [
      'Full structure and layout review',
      'Content and language feedback',
      'Tailored suggestions for finance roles',
      'Response within 48 hours',
    ],
  },
  {
    id: 'master',
    number: '02',
    title: 'Master Orientation Call',
    description:
      "Get guidance from those who have already navigated the graduate school path in finance. We help you identify the most suitable master's programme for your profile and professional goals, in Italy and abroad.",
    price: '€49,99',
    calendlyUrl: 'https://calendly.com/alatabrixiaic/30min',
    features: [
      '30-minute 1:1 session',
      'Personal profile analysis',
      'Programme comparison and ranking',
      'Application and admission advice',
    ],
  },
  {
    id: 'career',
    number: '03',
    title: 'Career Orientation Call',
    description:
      'A personalised consulting session to define your professional roadmap in the financial sector. From choosing your first internship to building your network, we help you take the right steps at the right time.',
    price: '€49,99',
    calendlyUrl: 'https://calendly.com/alatabrixiaic/30min',
    features: [
      '30-minute 1:1 session',
      'Professional goals definition',
      'Networking strategy',
      'Personal development plan',
    ],
  },
]
// -----------------------------------------------------------------------

export default async function CareerServicePage() {
  const supabase = await createClient()
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['show_prices', 'price_cv_review', 'price_master_orientation', 'price_career_orientation'])

  const s = Object.fromEntries((settingsRows ?? []).map(r => [r.key, r.value]))
  const showPrices = s['show_prices'] !== 'false'
  const prices: Record<string, string> = {
    'cv-review': s['price_cv_review'] ?? '€29,99',
    'master': s['price_master_orientation'] ?? '€49,99',
    'career': s['price_career_orientation'] ?? '€49,99',
  }

  return (
    <div>
      {/* Header — background image */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Image src="/vittoria.jpeg" alt="" fill className="object-cover object-top grayscale" priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="animate-hero-line text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Professional support</p>
            <h1 className="animate-hero-title font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Career Service
            </h1>
            <div className="animate-hero-line w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}>
              Services designed to accelerate your career in finance — from university orientation to landing your first role in the industry.
            </p>
          </div>
        </div>
      </section>

      {/* Services — light */}
      <section className="py-20 sm:py-28 bg-[#f7f5f0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-px bg-[#e5e5e5] md:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.id} delay={i * 150} direction="up">
                <div
                  className="hover-lift p-8 sm:p-10 flex flex-col h-full relative overflow-hidden"
                  style={{ background: '#ffffff', borderTop: '3px solid #1a4a3a' }}
                >
                  {/* Decorative number */}
                  <span
                    className="absolute -bottom-5 -right-3 font-serif font-bold leading-none text-[#1a4a3a] select-none pointer-events-none"
                    style={{ fontSize: '9rem', opacity: 0.05 }}
                    aria-hidden="true"
                  >{service.number}</span>

                  {/* Service number + title */}
                  <div className="mb-6 relative">
                    <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-2">{service.number}</p>
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="font-serif text-2xl font-medium text-[#0a0a0a]">
                        {service.title}
                      </h2>
                      {showPrices ? (
                        <span className="font-serif text-2xl font-medium text-[#1a4a3a] flex-shrink-0">
                          {prices[service.id]}
                        </span>
                      ) : (
                        <span className="text-xs font-medium tracking-wide uppercase text-[#6b7280] flex-shrink-0">
                          Contact us
                        </span>
                      )}
                    </div>
                    <div className="w-8 h-px bg-[#1a4a3a] mt-3" />
                  </div>

                  <div className="relative">
                    <p className="text-[#6b7280] text-sm leading-relaxed">{service.description}</p>
                  </div>

                  <ul className="space-y-2.5 flex-1 mt-6 relative">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-[#0a0a0a]">
                        <span className="w-1 h-1 rounded-full bg-[#1a4a3a] flex-shrink-0 mt-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={service.calendlyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-sm font-medium tracking-wide py-3.5 px-6 mt-6 relative"
                    style={{ transition: 'background-color 0.2s cubic-bezier(0.22,1,0.36,1), color 0.2s ease' }}
                  >
                    Book now
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Linktree — white */}
      <section className="py-20 bg-white border-t border-[#e5e5e5]">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-4">Follow us</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a] mb-4">
              All our links in one place
            </h2>
            <p className="text-[#6b7280] text-sm leading-relaxed mb-10">
              Follow Alata Investment Club on social media, access our resources, and stay updated on our activities.
            </p>
            <a
              href={LINKTREE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-10 py-4 transition-colors duration-200"
            >
              Visit our Linktree
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
