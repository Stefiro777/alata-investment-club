import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
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

      {/* ── Hero (split screen) ── */}
      <section className="flex min-h-[500px] lg:min-h-[610px]">

        {/* Left — image with green overlay */}
        <div className="relative hidden md:block w-1/2 flex-shrink-0 overflow-hidden">
          <Image
            src="/piazzavittoria.jpg"
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'rgba(26,74,58,0.5)' }} />
        </div>

        {/* Right — solid green, white text */}
        <div className="flex flex-col justify-center w-full md:w-1/2 px-10 py-20 sm:px-16 lg:px-20 bg-[#1a4a3a]">
          <p className="animate-hero-line text-xs tracking-[0.3em] uppercase text-white/50 mb-6">Join Us</p>
          <h1
            className="animate-hero-title font-serif font-bold text-white leading-[1.02] mb-6"
            style={{ fontSize: 'clamp(2.75rem, 7vw, 5.5rem)' }}
          >
            Become<br />a Member
          </h1>
          <div className="animate-hero-line w-10 h-px bg-white/30 mb-8" />
          <p
            className="text-white/65 text-base max-w-lg leading-relaxed"
            style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}
          >
            Join a meritocratic, collaborative environment where ambition meets finance.
          </p>
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
