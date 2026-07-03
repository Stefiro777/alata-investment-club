import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requireTeamAccess } from '@/lib/auth'

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Privileged roles (bod/director) or career team, resolved via club_members
// (the legacy `profiles` table is no longer consulted).
const verifyAdmin = async () => !!(await requireTeamAccess('career'))

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin())) return authError()
  const body = await req.json()
  const { type, reference_id, label, description, sort_order } = body
  if (!type || !reference_id || !label) {
    return NextResponse.json({ error: 'type, reference_id and label are required' }, { status: 400 })
  }
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('cart_suggestions')
    .insert({ type, reference_id, label, description: description || null, sort_order: sort_order ?? 0, visible: true })
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
