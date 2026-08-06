import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

// POST /api/admin/crm/contacts/manual — privileged-only manual walk-in entry.
// Inserts directly as checked-in since it's only used at the door for people
// who show up without a prior self-service registration.
export async function POST(req: NextRequest) {
  const member = await requirePrivilegedAccess()
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    event_id?: string
    nome?: string
    cognome?: string
    email?: string
    telefono?: string
    anno_di_studio?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const event_id = body.event_id?.trim()
  const nome = body.nome?.trim()
  const cognome = body.cognome?.trim()
  const email = body.email?.trim()
  const telefono = body.telefono?.trim()
  const anno_di_studio = body.anno_di_studio?.trim()

  if (!event_id || !nome || !cognome || !email || !anno_di_studio) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: eventRow, error: eventErr } = await supabase
    .from('upcoming_events')
    .select('id')
    .eq('id', event_id)
    .maybeSingle()

  if (eventErr || !eventRow) {
    return NextResponse.json({ error: 'Event not found' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('event_registrations')
    .insert({
      event_id,
      nome,
      cognome,
      email,
      telefono: telefono || null,
      anno_di_studio,
      source: 'manual',
      added_by: member.email,
      checked_in: true,
      checked_in_by: 'manual',
      checked_in_at: now,
    })
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

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
