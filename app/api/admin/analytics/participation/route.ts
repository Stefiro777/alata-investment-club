import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'
import { buildMemberIndex, matchMember, normalizeEmail } from '@/lib/member-matching'

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
  member_override: boolean | null
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
// Known limitations (accepted, not bugs):
// 1. Email grouping does not unify the same person across different emails
//    (typos, email changes over time) — a deliberate heuristic.
// 2. The member/external flag combines email-or-name matching (see
//    lib/member-matching.ts) with any member_override set on the person's
//    rows; name matching can misfire on homonyms, which is exactly what
//    member_override exists to correct.
export async function GET(req: NextRequest) {
  const user = await requirePrivilegedAccess()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const eventId = req.nextUrl.searchParams.get('event_id')
  const dateFrom = req.nextUrl.searchParams.get('date_from')
  const dateTo = req.nextUrl.searchParams.get('date_to')
  const memberFilter = req.nextUrl.searchParams.get('member_filter') // 'member' | 'external' | null

  let query = supabaseAdmin
    .from('event_registrations')
    .select('email, nome, cognome, created_at, event_id, member_override, upcoming_events(title, date)')

  if (eventId) query = query.eq('event_id', eventId)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const [{ data: regsData, error: regsErr }, { data: membersData, error: membersErr }] = await Promise.all([
    query,
    supabaseAdmin.from('club_members').select('email, full_name, member_id'),
  ])

  if (regsErr) return NextResponse.json({ error: regsErr.message }, { status: 400 })
  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 400 })

  const regs = (regsData ?? []) as unknown as RegistrationRow[]
  const memberIndex = buildMemberIndex(membersData ?? [])

  type PersonAccum = PersonSummary & {
    _eventIds: Set<string>
    _autoMemberId: string | null
    _autoIsMember: boolean
    _latestOverride: boolean | null
  }

  const byEmail = new Map<string, PersonAccum>()

  for (const r of regs) {
    const key = normalizeEmail(r.email)
    const eventTitle = r.upcoming_events?.title ?? 'Unknown'
    const eventDate = r.upcoming_events?.date ?? ''
    const autoMatch = matchMember(memberIndex, r.email, r.nome, r.cognome)

    let person = byEmail.get(key)
    if (!person) {
      person = {
        email: r.email,
        nome: r.nome,
        cognome: r.cognome,
        is_member: false,
        member_id: null,
        total_participations: 0,
        events: [],
        first_participation_at: r.created_at,
        last_participation_at: r.created_at,
        _eventIds: new Set<string>(),
        _autoMemberId: null,
        _autoIsMember: false,
        _latestOverride: null,
      }
      byEmail.set(key, person)
    }

    // An automatic match on any of the person's rows is enough to flag them.
    if (autoMatch) {
      person._autoIsMember = true
      person._autoMemberId = person._autoMemberId ?? autoMatch.member_id
    }

    // Most recent registration wins for display name and for which row's
    // member_override applies (a later manual correction overrides an older one).
    if (r.created_at >= person.last_participation_at) {
      person.nome = r.nome
      person.cognome = r.cognome
      person.last_participation_at = r.created_at
      person._latestOverride = r.member_override
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

  let people: PersonSummary[] = Array.from(byEmail.values()).map(p => {
    const isMember = p._latestOverride !== null ? p._latestOverride : p._autoIsMember
    const memberId = isMember ? p._autoMemberId : null
    const { _eventIds, _autoMemberId, _autoIsMember, _latestOverride, ...rest } = p
    void _eventIds; void _autoMemberId; void _autoIsMember; void _latestOverride
    return { ...rest, is_member: isMember, member_id: memberId }
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
