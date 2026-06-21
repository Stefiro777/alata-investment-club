import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const service = createServiceClient()
  const { data, error } = await service
    .from('post_plans')
    .select('id, title, description, team, scheduled_date, status, platform, content_type, assigned_to, notes, attachment_url')
    .order('scheduled_date', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, scheduled_date, platform, content_type, description, assigned_to, notes, attachment_url } = body
  if (!title || !scheduled_date) return NextResponse.json({ error: 'title e scheduled_date richiesti' }, { status: 400 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('post_plans')
    .insert({
      title,
      scheduled_date,
      platform: platform || null,
      content_type: content_type || null,
      description: description || null,
      assigned_to: assigned_to || null,
      notes: notes || null,
      attachment_url: attachment_url || null,
      team: 'general',
      status: 'draft',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
