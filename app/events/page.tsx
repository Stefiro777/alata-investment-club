import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import { Suspense } from 'react'
import EventsGrid from './EventsGrid'
import EventsReviewsWrapper from './EventsReviewsWrapper'
import UpcomingEvents from '@/app/components/UpcomingEvents'
import FeaturedGallery from '@/app/components/FeaturedGallery'
import LifeAtAlata from '@/app/components/LifeAtAlata'
import Parallax from '@/app/components/Parallax'
import { MotionReveal, MotionLine } from '@/app/components/motion/Motion'
import type { FeaturedGalleryItem } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const supabase = await createClient()

  const [{ data: eventi }, { data: featuredEvents }] = await Promise.all([
    supabase
      .from('contenuti')
      .select('*')
      .in('tipo', ['evento', 'aggiornamento'])
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('featured_events')
      .select('id, title, description, authors, media, display_order')
      .order('display_order', { ascending: true }),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Parallax>
          <Image src="/duomo.jpg" alt="" fill className="object-cover grayscale animate-ken-burns" style={{ objectPosition: 'center 50%' }} preload />
        </Parallax>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="absolute inset-0 hero-vignette" />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <MotionReveal delay={0} y={20}>
              <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">News &amp; Events</p>
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
                Events &amp; Updates
              </h1>
            </MotionReveal>
            <MotionLine delay={0.35} duration={0.8} className="w-12 h-px bg-white/30 mb-6" />
            <MotionReveal delay={0.45}>
              <p className="text-white/70 text-base max-w-2xl leading-relaxed">
                Stay up to date with the latest news, events and research from Alata Investment Club.
              </p>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* Upcoming Events — dark agenda section */}
      <Suspense fallback={null}>
        <UpcomingEvents />
      </Suspense>

      {/* Divider */}
      <div className="h-px bg-[#e5e5e5]" />

      {/* Grid with search */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {!eventi || eventi.length === 0 ? (
            <div className="py-20 text-center text-ink-500">
              <p className="text-sm tracking-wide">No events or updates available at the moment.</p>
            </div>
          ) : (
            <EventsGrid items={eventi} />
          )}
        </div>
      </section>

      {/* Life at Alata — real photos and clips from club events */}
      <LifeAtAlata />

      {/* Featured Events Gallery */}
      <FeaturedGallery
        items={(featuredEvents ?? []) as FeaturedGalleryItem[]}
        sectionLabel="Featured Event"
        title="Featured Events"
        subtitle="Highlights"
      />

      <EventsReviewsWrapper />
    </div>
  )
}
