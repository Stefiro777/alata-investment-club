import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requireTeamAccess } from '@/lib/auth'

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Privileged roles (bod/director) or career team, resolved via club_members
// (the legacy `profiles` table is no longer consulted).
const verifyAdmin = async () => !!(await requireTeamAccess('career'))

/** Raw rows for the dashboard tab (hidden ones included, no enrichment). */
export async function GET() {
  if (!(await verifyAdmin())) return authError()
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('cart_suggestions')
    .select('id, type, reference_id, label, description, visible, sort_order')
    .order('sort_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suggestions: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return authError()
  const body = await req.json()
  const { type, reference_id, label, description, sort_order } = body
  // A Career suggestion has no reference: it is resolved to a mentor at read time.
  if (!type || !label || (type !== 'career_service' && !reference_id)) {
    return NextResponse.json({ error: 'type, label and (for merch) reference_id are required' }, { status: 400 })
  }
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('cart_suggestions')
    .insert({ type, reference_id: type === 'career_service' ? null : reference_id, label, description: description || null, sort_order: sort_order ?? 0, visible: true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suggestion: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await verifyAdmin())) return authError()
  const body = await req.json()
  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('cart_suggestions')
    .update(fields)
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ suggestion: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyAdmin())) return authError()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createServiceClient()
  const { error } = await supabase.from('cart_suggestions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
