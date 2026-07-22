import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// event_images has a SELECT policy for authenticated users but no INSERT/
// UPDATE/DELETE policy, so writes go through this service-role route
// instead of the direct client Supabase calls used for upcoming_events.

export async function POST(request: NextRequest) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { event_id?: string; url?: string; display_order?: number }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { event_id, url, display_order } = body
  if (!event_id || !url) {
    return NextResponse.json({ error: 'Missing event_id or url' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('event_images')
    .insert({ event_id, url, display_order: display_order ?? 0 })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(request: NextRequest) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { updates?: { id: string; display_order: number }[] }
  try { body = await request.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const updates = body.updates
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'Missing updates' }, { status: 400 })
  }

  const service = createServiceClient()
  for (const u of updates) {
    const { error } = await service
      .from('event_images')
      .update({ display_order: u.display_order })
      .eq('id', u.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const service = createServiceClient()

  const { data: row } = await service.from('event_images').select('url').eq('id', id).maybeSingle()
  const { error } = await service.from('event_images').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Best-effort: also remove the underlying storage object so removing a
  // gallery photo doesn't leave it orphaned in the event-gallery bucket.
  const storagePath = row?.url?.split('/event-gallery/')[1]
  if (storagePath) await service.storage.from('event-gallery').remove([storagePath])

  return NextResponse.json({ success: true })
}
