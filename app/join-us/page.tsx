import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import ApplySection from './ApplySection'
import TimelineSection from './TimelineSection'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/join-us' },
}

export default async function JoinUsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'applications_open')
    .maybeSingle()

  const applicationsOpen = settings?.value === 'true'

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative py-24 sm:py-36 px-6 overflow-hidden" style={{ background: '#1a4a3a' }}>
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 65%)' }} />
        {/* Decorative large letter */}
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="animate-hero-line text-xs tracking-[0.3em] uppercase text-white/50 mb-6">Join Us</p>
          <h1
            className="animate-hero-title font-serif font-bold text-white leading-[1.02] mb-8"
            style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}
          >
            Become<br />a Member
          </h1>
          <div className="animate-hero-line flex items-center gap-5">
            <div className="w-10 h-px bg-white/30" />
            <p className="text-white/65 text-base max-w-lg leading-relaxed"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}>
              Join a meritocratic, collaborative environment where ambition meets finance.
            </p>
          </div>
        </div>
      </section>

      <TimelineSection />

      {/* ── Apply Now ── */}
      <section id="application-form" className="bg-[#1a4a3a] py-24 sm:py-32 px-6 relative overflow-hidden">
        <span
          className="absolute -top-8 -left-4 font-serif font-bold leading-none text-white select-none pointer-events-none hidden lg:block"
          style={{ fontSize: '18rem', opacity: 0.03, letterSpacing: '-0.05em' }}
          aria-hidden="true"
        >→</span>
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_auto] items-center gap-10">
            <div>
              <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-4">Applications</p>
              <h2 className="font-serif font-bold text-white leading-[1.05] mb-4"
                style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}>
                Ready to join?
              </h2>
              <div className="w-10 h-px bg-white/30 mb-5" />
              <p className="text-white/65 text-sm leading-relaxed max-w-md">
                Applications are reviewed on a rolling basis. We look for curiosity, commitment and the drive to grow.
              </p>
            </div>
            <div className="flex lg:justify-end">
              <ApplySection applicationsOpen={applicationsOpen} />
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
