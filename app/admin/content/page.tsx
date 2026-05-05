import { createClient, createServiceClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import NewsEventsSection from '../components/NewsEventsSection'
import FeaturedReportsClient from '../featured-reports/FeaturedReportsClient'
import ReviewsAdminSection from '../components/ReviewsAdminSection'
import UpcomingEventsAdminSection from '../components/UpcomingEventsAdminSection'
import FeaturedGalleryAdminClient from '../components/FeaturedGalleryAdminClient'
import PartnersSection from '../components/PartnersSection'
import ContentTabs from './ContentTabs'
import type { FeaturedReport, Review, UpcomingEvent, FeaturedGalleryItem, Partner } from '@/lib/types'

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

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')

  const serviceClient = createServiceClient()

  const [
    { data: contenuti },
    { data: featuredReportsData },
    { data: reviewsData },
    { data: upcomingEventsData },
    { data: featuredEventsData },
    { data: featuredPartnersData },
    { data: partnersData },
  ] = await Promise.all([
    supabase
      .from('contenuti')
      .select('*')
      .in('tipo', ['evento', 'news', 'aggiornamento'])
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('featured_reports')
      .select('id, title, description, pdf_url, authors, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false }),
    serviceClient
      .from('upcoming_events')
      .select('*')
      .order('date', { ascending: true }),
    supabase
      .from('featured_events')
      .select('id, title, description, authors, media, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('featured_partners')
      .select('id, title, description, authors, media, display_order')
      .order('display_order', { ascending: true }),
    supabase
      .from('partners')
      .select('id, name, logo_url, website_url, description, type, order_index, click_count, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  const reportsContent = (
    <FeaturedReportsClient reports={(featuredReportsData ?? []) as FeaturedReport[]} />
  )

  const eventsContent = (
    <>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <NewsEventsSection initialItems={(contenuti ?? []) as Contenuto[]} />
      </div>
      <div className="border-t border-line-faint" />
      <UpcomingEventsAdminSection initialEvents={(upcomingEventsData ?? []) as UpcomingEvent[]} />
      <div className="border-t border-line-faint" />
      <ReviewsAdminSection initialReviews={(reviewsData ?? []) as Review[]} />
      <div className="border-t border-line-faint" />
      <FeaturedGalleryAdminClient
        items={(featuredEventsData ?? []) as FeaturedGalleryItem[]}
        table="featured_events"
        bucket="event-gallery"
        heading="Featured Events Gallery"
        description="Appear on /events with media gallery. Drag to reorder."
      />
    </>
  )

  const partnersContent = (
    <>
      <div className="max-w-5xl mx-auto px-8 py-10">
        <PartnersSection initialPartners={(partnersData ?? []) as Partner[]} />
      </div>
      <div className="border-t border-line-faint" />
      <FeaturedGalleryAdminClient
        items={(featuredPartnersData ?? []) as FeaturedGalleryItem[]}
        table="featured_partners"
        bucket="partner-gallery"
        heading="Featured Partners Gallery"
        description="Appear on /partners with media gallery. Drag to reorder."
      />
    </>
  )

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <ContentTabs
          reportsContent={reportsContent}
          eventsContent={eventsContent}
          partnersContent={partnersContent}
        />
      </main>
    </>
  )
}
