import { createClient, createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const PED_STATUSES = ['draft', 'scheduled', 'published']

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const service = createServiceClient()
  const { error } = await service.from('post_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: { status?: unknown; posted?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Whitelist: this endpoint used to pass the raw body to .update(), letting
  // any logged-in user overwrite arbitrary columns (created_by, team, ...).
  const update: { status?: string; posted?: boolean } = {}
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !PED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'invalid status' }, { status: 400 })
    }
    update.status = body.status
  }
  if (body.posted !== undefined) {
    if (typeof body.posted !== 'boolean') {
      return NextResponse.json({ error: 'posted must be boolean' }, { status: 400 })
    }
    update.posted = body.posted
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service.from('post_plans').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
