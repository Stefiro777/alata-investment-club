import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RegistrationRow = {
  email: string
  nome: string
  cognome: string
  created_at: string
  event_id: string
  upcoming_events: { title: string; date: string } | null
}

type PersonEvent = { event_id: string; title: string; date: string }

type PersonSummary = {
  email: string
  nome: string
  cognome: string
  is_member: boolean
  member_id: string | null
  total_participations: number
  events: PersonEvent[]
  first_participation_at: string
  last_participation_at: string
}

// GET /api/admin/analytics/participation
// Groups event_registrations by LOWER(email) into a per-person participation
// summary. Query params: event_id, date_from, date_to, member_filter=('member'|'external').
//
// Known limitation (accepted, not a bug): matching is done purely on lower(email).
// It does not unify the same person across different emails (typos, email
// changes over time) — this is a deliberate heuristic, not a defect.
export async function GET(req: NextRequest) {
  const user = await requirePrivilegedAccess()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('event_id')
  const dateFrom = req.nextUrl.searchParams.get('date_from')
  const dateTo = req.nextUrl.searchParams.get('date_to')
  const memberFilter = req.nextUrl.searchParams.get('member_filter') // 'member' | 'external' | null

  let query = supabaseAdmin
    .from('event_registrations')
    .select('email, nome, cognome, created_at, event_id, upcoming_events(title, date)')

  if (eventId) query = query.eq('event_id', eventId)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const [{ data: regsData, error: regsErr }, { data: membersData, error: membersErr }] = await Promise.all([
    query,
    supabaseAdmin.from('club_members').select('email, member_id'),
  ])

  if (regsErr) return NextResponse.json({ error: regsErr.message }, { status: 400 })
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 400 })

  const regs = (regsData ?? []) as unknown as RegistrationRow[]

  const memberByEmail = new Map<string, string | null>()
  for (const m of membersData ?? []) {
    if (m.email) memberByEmail.set(m.email.toLowerCase(), (m as { member_id: string | null }).member_id ?? null)
  }

  const byEmail = new Map<string, PersonSummary & { _eventIds: Set<string> }>()

  for (const r of regs) {
    const key = r.email.toLowerCase()
    const eventTitle = r.upcoming_events?.title ?? 'Unknown'
    const eventDate = r.upcoming_events?.date ?? ''

    let person = byEmail.get(key)
    if (!person) {
      const isMember = memberByEmail.has(key)
      person = {
        email: r.email,
        nome: r.nome,
        cognome: r.cognome,
        is_member: isMember,
        member_id: isMember ? (memberByEmail.get(key) ?? null) : null,
        total_participations: 0,
        events: [],
        first_participation_at: r.created_at,
        last_participation_at: r.created_at,
        _eventIds: new Set<string>(),
      }
      byEmail.set(key, person)
    }

    // Most recent registration wins for display name.
    if (r.created_at >= person.last_participation_at) {
      person.nome = r.nome
      person.cognome = r.cognome
      person.last_participation_at = r.created_at
    }
    if (r.created_at < person.first_participation_at) {
      person.first_participation_at = r.created_at
    }

    if (!person._eventIds.has(r.event_id)) {
      person._eventIds.add(r.event_id)
      person.events.push({ event_id: r.event_id, title: eventTitle, date: eventDate })
      person.total_participations = person._eventIds.size
    }
  }

  let people: PersonSummary[] = Array.from(byEmail.values()).map(({ _eventIds, ...rest }) => {
    void _eventIds
    return rest
  })

  if (memberFilter === 'member') people = people.filter(p => p.is_member)
  if (memberFilter === 'external') people = people.filter(p => !p.is_member)

  people.sort((a, b) => b.total_participations - a.total_participations)

  const distribution: Record<string, number> = {}
  for (const p of people) {
    const bucket = p.total_participations >= 4 ? '4+' : String(p.total_participations)
    distribution[bucket] = (distribution[bucket] ?? 0) + 1
  }

  return NextResponse.json({
    people,
    total_people: people.length,
    total_participations: regs.length,
    members_count: people.filter(p => p.is_member).length,
    external_count: people.filter(p => !p.is_member).length,
    distribution,
  })
}
