import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { buildMemberIndex, resolveIsMember } from '@/lib/member-matching'

const supabaseAdmin = createServiceClient()

// Shared privileged-access check (bod/director)
const checkAuth = requirePrivilegedAccess

// Fields the PATCH endpoint is allowed to touch — everything else in the
// request body is ignored to avoid mass-assignment onto arbitrary columns
// (e.g. source, checked_in, added_by must not be settable from this form).
const EDITABLE_FIELDS = [
  'nome', 'cognome', 'email', 'telefono', 'anno_di_studio',
  'motivazione', 'questions_for_panelists', 'member_override',
] as const

export async function GET() {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [regsRes, eventsRes, membersRes] = await Promise.all([
    supabaseAdmin
    .from('event_registrations')
    .select(`
      id,
      event_id,
      nome,
      cognome,
      email,
      telefono,
      anno_di_studio,
      motivazione,
      questions_for_panelists,
      created_at,
      source,
      added_by,
      member_override,
      checked_in,
      checked_in_at,
      checked_in_by,
      upcoming_events (
        title,
        date
      )
    `)
    .order('created_at', { ascending: false }),
    // All events, not only the ones that already have registrations, so the
    // event dropdown (and "add participant") works for events with no sign-ups yet.
    supabaseAdmin
      .from('upcoming_events')
      .select('id, title, date')
      .order('date', { ascending: false }),
    supabaseAdmin.from('club_members').select('email, full_name, member_id'),
  ])

  if (regsRes.error) return NextResponse.json({ error: regsRes.error.message }, { status: 500 })
  if (eventsRes.error) return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })
  if (membersRes.error) return NextResponse.json({ error: membersRes.error.message }, { status: 500 })

  // Same heuristic as the analytics routes (email, then name; member_override wins).
  const memberIndex = buildMemberIndex(membersRes.data ?? [])
  const data = (regsRes.data ?? []).map(r => ({
    ...r,
    is_member: resolveIsMember(memberIndex, r.email ?? '', r.nome ?? '', r.cognome ?? '', r.member_override ?? null).isMember,
  }))

  return NextResponse.json({ data, events: eventsRes.data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; [key: string]: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const fields: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) fields[key] = body[key]
  }

  if ('member_override' in fields && fields.member_override !== null && typeof fields.member_override !== 'boolean') {
    return NextResponse.json({ error: 'member_override must be true, false or null' }, { status: 400 })
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .update(fields)
    .eq('id', id)
    .select(`
      id,
      event_id,
      nome,
      cognome,
      email,
      telefono,
      anno_di_studio,
      motivazione,
      questions_for_panelists,
      created_at,
      source,
      added_by,
      member_override,
      checked_in,
      checked_in_at,
      checked_in_by,
      upcoming_events (
        title,
        date
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let id: string | null = req.nextUrl.searchParams.get('id')
  if (!id) {
    try {
      const body = await req.json()
      id = body.id ?? null
    } catch {
      // ignore
    }
  }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
