import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

function authError() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return false
  const supabase = createServiceClient()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return false
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, teams')
    .eq('id', user.id)
    .single()
  if (!profile) return false
  const isAdmin =
    profile.role === 'bod' ||
    profile.role === 'director' ||
    (profile.teams ?? []).includes('career')
  return isAdmin
}

export async function POST(req: NextRequest) {
  if (!(await verifyAdmin(req))) return authError()
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
  if (!(await verifyAdmin(req))) return authError()
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
  if (!(await verifyAdmin(req))) return authError()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const supabase = createServiceClient()
  const { error } = await supabase.from('cart_suggestions').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
