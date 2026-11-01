'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import VenuesSection from '@/components/dashboard/VenuesSection'
import UpcomingEventsAdminSection from '@/app/admin/components/UpcomingEventsAdminSection'
import PartnersSection from '@/app/admin/components/PartnersSection'
import NewsEventsSection from '@/app/admin/components/NewsEventsSection'
import FeaturedGalleryAdminClient from '@/app/admin/components/FeaturedGalleryAdminClient'
import { Tabs } from '@/app/components/member/ui'
import type { UpcomingEvent, Partner, FeaturedGalleryItem } from '@/lib/types'

// ── EventsContentTab ──────────────────────────────────────────────────────────

type ContentSubTab = 'upcoming-events' | 'event-cards' | 'featured-events' | 'partners' | 'venues'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  immagine_url: string | null
  photos: string[] | null
}

const CONTENT_SUB_TABS: { key: ContentSubTab; label: string }[] = [
  { key: 'upcoming-events',  label: 'Events' },
  { key: 'event-cards',      label: 'Event cards' },
  { key: 'featured-events',  label: 'Stories' },
  { key: 'partners',         label: 'Partners' },
  { key: 'venues',           label: 'Venues' },
]

export default function EventsContentTab() {
  const [subTab, setSubTab]                 = useState<ContentSubTab>('upcoming-events')
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[] | null>(null)
  const [contenuti, setContenuti]           = useState<Contenuto[] | null>(null)
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedGalleryItem[] | null>(null)
  const [partners, setPartners]             = useState<Partner[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('upcoming_events')
      .select('*')
      .order('date', { ascending: true })
      .then(({ data }) => setUpcomingEvents((data ?? []) as UpcomingEvent[]))
    supabase
      .from('contenuti')
      .select('*')
      .eq('tipo', 'evento')
      .order('data_pubblicazione', { ascending: false })
      .then(({ data }) => setContenuti((data ?? []) as Contenuto[]))
    supabase
      .from('featured_events')
      .select('id, title, description, authors, media, display_order')
      .order('display_order', { ascending: true })
      .then(({ data }) => setFeaturedEvents((data ?? []) as FeaturedGalleryItem[]))
    supabase
      .from('partners')
      .select('id, name, logo_url, website_url, description, type, order_index, click_count, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => setPartners((data ?? []) as Partner[]))
  }, [])

  return (
    <div>
      <div className="mb-8">
        <Tabs tabs={CONTENT_SUB_TABS} value={subTab} onChange={setSubTab} />
      </div>

      {subTab === 'upcoming-events' && (
        upcomingEvents === null
          ? <p className="py-8 text-[13px] text-earth-600">Loading…</p>
          : <UpcomingEventsAdminSection initialEvents={upcomingEvents} />
      )}
      {subTab === 'event-cards' && (
        contenuti === null
          ? <p className="py-8 text-[13px] text-earth-600">Loading…</p>
          : <NewsEventsSection initialItems={contenuti} />
      )}
      {subTab === 'featured-events' && (
        featuredEvents === null
          ? <p className="py-8 text-[13px] text-earth-600">Loading…</p>
          : <FeaturedGalleryAdminClient
              items={featuredEvents}
              table="featured_events"
              bucket="venue-photos"
              heading="Featured Events"
              description="Manage featured event gallery"
            />
      )}
      {subTab === 'partners' && (
        partners === null
          ? <p className="py-8 text-[13px] text-earth-600">Loading…</p>
          : <PartnersSection initialPartners={partners} />
      )}
      {subTab === 'venues' && <VenuesSection />}
    </div>
  )
}

