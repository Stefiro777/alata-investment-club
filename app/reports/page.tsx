import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import ReportsCarousel from '../components/ReportsCarousel'
import Reveal from '../components/Reveal'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/reports' },
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('contenuti')
    .select('*')
    .eq('tipo', 'report')
    .order('data_pubblicazione', { ascending: false })

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Image src="/castello.jpg" alt="" fill className="object-cover grayscale" style={{ objectPosition: 'center 60%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="animate-hero-line text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Our Reports</p>
            <h1 className="animate-hero-title font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Research &amp; Analysis
            </h1>
            <div className="animate-hero-line w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}>
              Equity research, macroeconomic analysis, M&amp;A insights, thematic reports and quarterly earnings breakdowns.
            </p>
          </div>
        </div>
      </section>

      {/* Carousel */}
      <section className="py-20 sm:py-28 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal>
            <ReportsCarousel reports={reports ?? []} />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
