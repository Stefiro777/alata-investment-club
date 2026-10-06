import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'
import { uniqueSlug } from '@/lib/slug'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// Fields the team can set directly. member_id goes through link_member_email,
// slug is generated, id/created_at/updated_at are never client-controlled.
const EDITABLE_FIELDS = [
  'full_name', 'role_title', 'photo_url', 'bio_short', 'bio_long',
  'notification_email', 'active', 'display_order',
] as const

function pickEditable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) if (key in body) out[key] = body[key]
  return out
}

type LinkResult = { memberId: string | null } | { error: string; status: number }

/**
 * Resolves a club member by email to link to a mentor. An empty email unlinks.
 * The link is stored as career_mentors.member_id and is the ONLY identity used to
 * decide that an account is a given mentor.
 */
async function resolveMemberLink(email: string, mentorId: string | null): Promise<LinkResult> {
  const clean = email.trim().toLowerCase()
  if (!clean) return { memberId: null }
  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('id')
    .ilike('email', clean.replace(/[\\%_]/g, c => `\\${c}`))
    .maybeSingle()
  if (!member) return { error: 'Nessun membro del club con questa email.', status: 404 }

  let query = supabaseAdmin.from('career_mentors').select('id').eq('member_id', member.id)
  if (mentorId) query = query.neq('id', mentorId)
  const { data: other } = await query.maybeSingle()
  if (other) return { error: 'Questo membro è già collegato a un altro mentor.', status: 409 }
  return { memberId: member.id }
}

/**
 * GET is shared between the public career-service page and the dashboard
 * Mentors tab: team career / bod / director callers (cookie session) get the
 * full admin listing (all mentors, all columns, plus the linked account); everyone
 * else gets the public reduced view (active mentors only) with `bookable`: the
 * mentor has at least one active availability row.
 */
export async function GET() {
  if (await requireTeamAccess('career')) {
    const { data, error } = await supabaseAdmin
      .from('career_mentors')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const memberIds = (data ?? []).map(m => m.member_id).filter((id): id is string => !!id)
    const members = new Map<string, { id: string; full_name: string; email: string }>()
    if (memberIds.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from('club_members')
        .select('id, full_name, email')
        .in('id', memberIds)
      for (const r of rows ?? []) members.set(r.id, r)
    }
    return NextResponse.json({
      data: (data ?? []).map(m => ({ ...m, linked_member: m.member_id ? members.get(m.member_id) ?? null : null })),
    })
  }

  const { data: mentors, error } = await supabaseAdmin
    .from('career_mentors')
    .select('id, slug, full_name, role_title, photo_url, bio_short, bio_long, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mentorIds = (mentors ?? []).map(m => m.id)
  const withAvailability = new Set<string>()
  if (mentorIds.length > 0) {
    const { data: availRows } = await supabaseAdmin
      .from('career_availability')
      .select('mentor_id')
      .in('mentor_id', mentorIds)
      .eq('active', true)
    for (const row of availRows ?? []) if (row.mentor_id) withAvailability.add(row.mentor_id)
  }

  const data = (mentors ?? []).map(m => ({ ...m, bookable: withAvailability.has(m.id) }))
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const body = await req.json() as Record<string, unknown>
    const fields = pickEditable(body)
    const fullName = typeof fields.full_name === 'string' ? fields.full_name.trim() : ''
    if (!fullName) return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
    if (typeof fields.role_title !== 'string' || !fields.role_title.trim()) return NextResponse.json({ error: 'role_title is required' }, { status: 400 })
    if (typeof fields.notification_email !== 'string' || !fields.notification_email.trim()) return NextResponse.json({ error: 'notification_email is required' }, { status: 400 })

    // Link the account by email when the notification address belongs to a member
    // (or to the explicitly given link_member_email); a missing member is not an
    // error, the team can link later from the Mentors tab.
    const linkEmail = typeof body.link_member_email === 'string' ? body.link_member_email : fields.notification_email
    const link = await resolveMemberLink(linkEmail, null)
    const memberId = 'memberId' in link ? link.memberId : null
    if ('error' in link && typeof body.link_member_email === 'string' && body.link_member_email.trim()) {
      return NextResponse.json({ error: link.error }, { status: link.status })
    }

    const slug = await uniqueSlug(supabaseAdmin, fullName, 'career_mentors')
    const { data, error } = await supabaseAdmin
      .from('career_mentors')
      .insert({ ...fields, full_name: fullName, slug, member_id: memberId })
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? [])[0] ?? null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const body = await req.json() as Record<string, unknown>
    const id = body.id
    if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const fields = pickEditable(body)
    if (typeof body.link_member_email === 'string') {
      const link = await resolveMemberLink(body.link_member_email, id)
      if ('error' in link) return NextResponse.json({ error: link.error }, { status: link.status })
      fields.member_id = link.memberId
    }
    if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('career_mentors')
      .update(fields)
      .eq('id', id)
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? [])[0] ?? null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // career_bookings.mentor_id has no ON DELETE: a mentor with bookings keeps
    // its history and can only be deactivated.
    const { count: bookingCount, error: countError } = await supabaseAdmin
      .from('career_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('mentor_id', id)
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    if ((bookingCount ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Questo mentor ha prenotazioni: non si può eliminare, disattivalo.' },
        { status: 409 }
      )
    }

    // career_availability.mentor_id has no ON DELETE either: remove its slots first.
    const { error: availError } = await supabaseAdmin.from('career_availability').delete().eq('mentor_id', id)
    if (availError) return NextResponse.json({ error: availError.message }, { status: 500 })

    const { error } = await supabaseAdmin.from('career_mentors').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
