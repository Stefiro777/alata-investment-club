import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RegistrationRow = {
  event_id: string
  email: string
  checked_in: boolean
  source: 'self' | 'manual'
}

type EventBreakdown = {
  event_id: string
  title: string
  date: string
  total_registrations: number
  members_count: number
  external_count: number
  checked_in_count: number
  no_show_count: number
  manual_count: number
  self_count: number
}

// GET /api/admin/analytics/events-breakdown
// Per-event participation breakdown: member vs external (by lower(email)
// match against club_members), checked-in vs no-show, manual vs self-service.
export async function GET() {
  const user = await requirePrivilegedAccess()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: eventsData, error: eventsErr }, { data: regsData, error: regsErr }, { data: membersData, error: membersErr }] =
    await Promise.all([
      supabaseAdmin.from('upcoming_events').select('id, title, date').order('date', { ascending: false }),
      supabaseAdmin.from('event_registrations').select('event_id, email, checked_in, source'),
      supabaseAdmin.from('club_members').select('email'),
    ])

  if (eventsErr) return NextResponse.json({ error: eventsErr.message }, { status: 400 })
  if (regsErr) return NextResponse.json({ error: regsErr.message }, { status: 400 })
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 400 })

  const memberEmails = new Set((membersData ?? []).map(m => m.email?.toLowerCase()).filter(Boolean))
  const regs = (regsData ?? []) as RegistrationRow[]

  const byEvent = new Map<string, EventBreakdown>()
  for (const e of eventsData ?? []) {
    byEvent.set(e.id, {
      event_id: e.id,
      title: e.title,
      date: e.date,
      total_registrations: 0,
      members_count: 0,
      external_count: 0,
      checked_in_count: 0,
      no_show_count: 0,
      manual_count: 0,
      self_count: 0,
    })
  }

  for (const r of regs) {
    const ev = byEvent.get(r.event_id)
    if (!ev) continue // registration references an event no longer present

    ev.total_registrations += 1
    if (memberEmails.has(r.email?.toLowerCase())) ev.members_count += 1
    else ev.external_count += 1

    if (r.checked_in) ev.checked_in_count += 1
    else ev.no_show_count += 1

    if (r.source === 'manual') ev.manual_count += 1
    else ev.self_count += 1
  }

  const events = Array.from(byEvent.values())

  return NextResponse.json({ events })
}
