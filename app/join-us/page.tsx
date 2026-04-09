import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import ApplySection from './ApplySection'
import TimelineSection from './TimelineSection'
import Reveal from '@/app/components/Reveal'

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
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Image src="/piazzavittoria.jpg" alt="" fill className="object-cover grayscale" style={{ objectPosition: 'center 60%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.55)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="animate-hero-line text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Join Us</p>
            <h1 className="animate-hero-title font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Become a Member
            </h1>
            <div className="animate-hero-line w-12 h-px bg-white/30 mb-6" />
            <p
              className="text-white/70 text-base max-w-2xl leading-relaxed"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}
            >
              Join a meritocratic, collaborative environment where ambition meets finance.
            </p>
          </div>
        </div>
      </section>

      <TimelineSection />

      {/* ── Cream band separator ── */}
      <div style={{ height: 4, background: '#f7f5f0' }} />

      {/* ── Apply Now ── */}
      <section id="application-form" className="bg-white py-24 sm:py-32 px-6 relative overflow-hidden">
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-[1fr_auto] items-center gap-10">
            <Reveal>
              <div>
                <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: '#9ca3af' }}>Applications</p>
                <h2
                  className="font-serif font-bold leading-[1.05] mb-4"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#1a4a3a' }}
                >
                  Ready to join?
                </h2>
                <div className="w-10 h-px mb-5" style={{ background: '#1a4a3a' }} />
                <p className="text-sm leading-relaxed max-w-md" style={{ color: '#6b7280' }}>
                  Applications are reviewed on a rolling basis. We look for curiosity, commitment and the drive to grow.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120} direction="left">
              <div className="flex lg:justify-end">
                <ApplySection applicationsOpen={applicationsOpen} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </div>
  )
}
