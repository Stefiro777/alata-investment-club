import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import ReportsCarousel from '../components/ReportsCarousel'
import FeaturedReports from '../components/FeaturedReports'
import Reveal from '../components/Reveal'
import Parallax from '../components/Parallax'
import type { FeaturedReport } from '@/lib/types'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/reports' },
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const [{ data: reports }, { data: featuredData }] = await Promise.all([
    supabase
      .from('contenuti')
      .select('*')
      .eq('tipo', 'report')
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('featured_reports')
      .select('id, title, description, image_url, pdf_url, authors, display_order, created_at')
      .order('display_order', { ascending: true }),
  ])

  const featured = (featuredData ?? []) as FeaturedReport[]

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Parallax>
          <Image src="/castello.jpg" alt="" fill className="object-cover grayscale animate-ken-burns" style={{ objectPosition: 'center 60%' }} preload />
        </Parallax>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="absolute inset-0 hero-vignette" />
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
      <section className="py-20 sm:py-28 bg-paper-stone" style={{ background: '#f5f5f5' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal className="mb-14">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Publications</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Our Research</h2>
            <div className="w-10 h-px bg-forest mb-5" />
            <p className="text-ink-500 text-sm max-w-xl leading-relaxed">
              Browse our latest reports, analyses and insights produced by Alata Investment Club members.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <ReportsCarousel reports={reports ?? []} />
          </Reveal>
        </div>
      </section>

      {/* Featured Reports */}
      {featured.length > 0 && <FeaturedReports reports={featured} />}
    </div>
  )
}
