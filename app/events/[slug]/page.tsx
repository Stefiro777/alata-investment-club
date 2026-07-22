import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import EventDetailClient from './EventDetailClient'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabase.from('upcoming_events').select('title').eq('slug', slug).maybeSingle()
  return { title: data?.title ? `${data.title} — Alata Investment Club` : 'Event — Alata Investment Club' }
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const { data: event } = await supabase
    .from('upcoming_events')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!event) notFound()

  const { data: images } = await supabase
    .from('event_images')
    .select('id, url, display_order')
    .eq('event_id', event.id)
    .order('display_order', { ascending: true })

  return <EventDetailClient event={event} images={images ?? []} />
}
