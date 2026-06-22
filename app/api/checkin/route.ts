import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, reason: 'missing_token' })

  const { data: reg, error } = await supabaseAdmin
    .from('event_registrations')
    .select('id, nome, cognome, event_id, checked_in, checked_in_at')
    .eq('id', token)
    .maybeSingle()

  if (error || !reg) return NextResponse.json({ valid: false, reason: 'not_found' })

  if (reg.checked_in) {
    return NextResponse.json({
      valid: false,
      reason: 'already_checked_in',
      checked_in_at: reg.checked_in_at,
      nome: reg.nome,
      cognome: reg.cognome,
    })
  }

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('event_registrations')
    .update({ checked_in: true, checked_in_at: now, checked_in_by: 'scanner' })
    .eq('id', token)

  const { data: event } = await supabaseAdmin
    .from('upcoming_events')
    .select('title')
    .eq('id', reg.event_id)
    .single()

  return NextResponse.json({
    valid: true,
    nome: reg.nome,
    cognome: reg.cognome,
    event_title: event?.title ?? '',
  })
}

export async function PATCH(req: NextRequest) {
  let body: { id?: string; checked_in?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, checked_in } = body
  if (!id || checked_in === undefined) {
    return NextResponse.json({ error: 'Missing id or checked_in' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { checked_in }
  if (checked_in) {
    updates.checked_in_at = new Date().toISOString()
    updates.checked_in_by = 'manual'
  } else {
    updates.checked_in_at = null
    updates.checked_in_by = null
  }

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
