import type { Metadata } from 'next'
import Image from 'next/image'
import Reveal from '../components/Reveal'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/career-service' },
}

const LINKTREE_URL = 'https://linktr.ee/alatainvestmentclub'
const CALENDLY_URL = 'https://calendly.com/alatabrixiaic/30min'

const masterServices = [
  {
    number: '01',
    title: 'Master Orientation',
    description:
      "Personalized guidance to identify the right master's programs based on your profile, goals, and target schools. We help you build a compelling application strategy.",
  },
  {
    number: '02',
    title: 'GMAT / IELTS Prep',
    description:
      'Structured preparation sessions for GMAT and IELTS, focused on your weak areas. Get actionable feedback and a tailored study plan from members with first-hand experience.',
  },
  {
    number: '03',
    title: 'Finance Technicals',
    description:
      'Hands-on training in financial modelling, accounting fundamentals, and valuation — the core skills expected in finance internships and graduate roles.',
  },
]

const careerServices = [
  {
    number: '01',
    title: 'Career Orientation',
    description:
      'One-on-one sessions to map your career path in finance. We help you define your target roles, sectors, and firms, and build a realistic action plan.',
  },
  {
    number: '02',
    title: 'Interview Prep',
    description:
      'Mock interviews and technical drills tailored to investment banking, consulting, and asset management recruitment processes. Real questions, real feedback.',
  },
  {
    number: '03',
    title: 'CV / Cover Letter Review',
    description:
      'Expert review of your CV and cover letter with detailed written feedback and a revised version. Aligned with the standards of top financial firms.',
  },
]

function ServiceSubCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="relative overflow-hidden p-6 sm:p-8 flex flex-col" style={{ background: '#ffffff', borderTop: '2px solid #1a4a3a' }}>
      {/* Decorative background number */}
      <span
        className="absolute -bottom-4 -right-2 font-serif font-bold leading-none select-none pointer-events-none"
        style={{ fontSize: '7rem', color: '#1a4a3a', opacity: 0.05 }}
        aria-hidden="true"
      >
        {number}
      </span>

      <div className="mb-4 relative">
        <p className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: '#1a4a3a', opacity: 0.6 }}>{number}</p>
        <h3 className="font-serif text-xl font-medium text-ink-900">{title}</h3>
        <div className="w-6 h-px mt-3" style={{ background: '#1a4a3a' }} />
      </div>

      <p className="text-ink-500 text-sm leading-relaxed flex-1 relative">{description}</p>

      <a
        href={CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 w-full border border-forest text-forest hover:bg-forest hover:text-white text-sm font-medium tracking-wide py-3 px-6 mt-6 relative"
        style={{ transition: 'background-color 0.2s cubic-bezier(0.22,1,0.36,1), color 0.2s ease' }}
      >
        Book Now
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </a>
    </div>
  )
}

export default function CareerServicePage() {
  return (
    <div>
      {/* Hero */}
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
            <p
              className="text-white/70 text-base max-w-2xl leading-relaxed"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}
            >
              Services designed to accelerate your career in finance — from university orientation to landing your first role in the industry.
            </p>
          </div>
        </div>
      </section>

      {/* Two windows */}
      <section className="py-20 sm:py-28 bg-[#f5f5f0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* Window 1: Master & Education */}
            <Reveal delay={0} direction="up">
              <div className="flex flex-col h-full" style={{ border: '2px solid #1a4a3a' }}>
                {/* Green title header */}
                <div className="px-8 py-6" style={{ background: '#1a4a3a' }}>
                  <h2
                    className="font-serif text-3xl sm:text-4xl font-bold uppercase text-white mb-2"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    Master &amp; Education
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    Academic guidance and technical preparation for top programs
                  </p>
                </div>

                {/* Sub-sections — horizontal grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 flex-1">
                  {masterServices.map((service, i) => (
                    <Reveal key={service.number} delay={i * 100} direction="up">
                      <ServiceSubCard {...service} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Window 2: Career */}
            <Reveal delay={150} direction="up">
              <div className="flex flex-col h-full" style={{ border: '2px solid #1a4a3a' }}>
                {/* Green title header */}
                <div className="px-8 py-6" style={{ background: '#1a4a3a' }}>
                  <h2
                    className="font-serif text-3xl sm:text-4xl font-bold uppercase text-white mb-2"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    Career
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                    End-to-end support for your professional journey in finance
                  </p>
                </div>

                {/* Sub-sections — horizontal grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 flex-1">
                  {careerServices.map((service, i) => (
                    <Reveal key={service.number} delay={i * 100} direction="up">
                      <ServiceSubCard {...service} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* Linktree CTA */}
      <section className="py-20 bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">Follow us</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">
              All our links in one place
            </h2>
            <p className="text-ink-500 text-sm leading-relaxed mb-10">
              Follow Alata Investment Club on social media, access our resources, and stay updated on our activities.
            </p>
            <a
              href={LINKTREE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide px-10 py-4 transition-colors duration-fast"
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
