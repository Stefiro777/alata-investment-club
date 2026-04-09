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

      {/* ── Apply Now ── */}
      <section id="application-form" className="py-24 sm:py-32 px-6" style={{ background: '#1a4a3a' }}>
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <p className="text-xs tracking-[0.3em] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Applications
            </p>
            <h2
              className="font-serif font-bold leading-[1.05] mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: '#ffffff' }}
            >
              Ready to join?
            </h2>
            <div className="w-10 h-px mx-auto mb-6" style={{ background: 'rgba(255,255,255,0.3)' }} />
            <p className="text-sm leading-relaxed mb-10 mx-auto max-w-md" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Applications are reviewed on a rolling basis. We look for curiosity, commitment and the drive to grow.
            </p>
            <div className="flex justify-center">
              <ApplySection applicationsOpen={applicationsOpen} />
            </div>
          </Reveal>
        </div>
      </section>

    </div>
  )
}
