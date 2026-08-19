import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { uniqueSlug } from '@/lib/slug'

export async function GET() {
  const service = createServiceClient()
  const { data, error } = await service
    .from('upcoming_events')
    .select('*')
    .order('date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, title, description, location, start_time, end_time } = body
  if (!date || !title) return NextResponse.json({ error: 'date e title richiesti' }, { status: 400 })

  const service = createServiceClient()
  const slug = await uniqueSlug(service, title)
  const { data, error } = await service
    .from('upcoming_events')
    .insert({
      date,
      title,
      description: description || null,
      location: location || null,
      start_time: start_time || null,
      end_time: end_time || null,
      status: 'coming_soon',
      slug,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
