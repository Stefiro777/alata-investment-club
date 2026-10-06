import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getCareerActor, canManageMentor, type CareerActor } from '@/lib/career-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

function bad(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function validTime(t: unknown): t is string {
  return typeof t === 'string' && TIME_RE.test(t) && minutes(t) < 24 * 60
}

/**
 * Availability belongs to a mentor. Staff (career team, bod/director) manage every
 * mentor; a mentor only their own rows. The mentor of a new row comes from the
 * session for mentors, and is never taken from the client for them.
 */
async function ownerOf(id: string): Promise<{ mentor_id: string | null } | null> {
  const { data } = await supabaseAdmin.from('career_availability').select('mentor_id').eq('id', id).maybeSingle()
  return data ?? null
}

export async function GET(req: NextRequest) {
  const actor = await getCareerActor()
  if (!actor) return forbidden()
  try {
    const requested = req.nextUrl.searchParams.get('mentor_id')
    const mentorId = requested ?? (actor.staff ? null : actor.mentorId)
    if (requested && !canManageMentor(actor, requested)) return forbidden()

    let query = supabaseAdmin
      .from('career_availability')
      .select('*')
      .order('type')
      .order('day_of_week', { nullsFirst: false })
      .order('date', { nullsFirst: false })
      .order('start_time')
    if (mentorId) query = query.eq('mentor_id', mentorId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

function resolveMentorForWrite(actor: CareerActor, requested: unknown): string | null {
  if (!actor.staff) return actor.mentorId
  return typeof requested === 'string' && requested ? requested : null
}

export async function POST(req: NextRequest) {
  const actor = await getCareerActor()
  if (!actor) return forbidden()
  try {
    const body = await req.json() as Record<string, unknown>
    const mentorId = resolveMentorForWrite(actor, body.mentor_id)
    if (!mentorId) return bad('mentor_id is required')
    if (!canManageMentor(actor, mentorId)) return forbidden()
    // A mentor never writes for someone else, even by naming them in the body.
    if (!actor.staff && body.mentor_id && body.mentor_id !== actor.mentorId) return forbidden()

    const { data: mentor } = await supabaseAdmin.from('career_mentors').select('id').eq('id', mentorId).maybeSingle()
    if (!mentor) return bad('Mentor not found')

    const type = body.type
    if (type !== 'recurring' && type !== 'one_time') return bad('type must be recurring or one_time')
    if (!validTime(body.start_time) || !validTime(body.end_time)) return bad('start_time and end_time are required (HH:MM)')
    if (minutes(body.end_time) <= minutes(body.start_time)) return bad('end_time must be after start_time')

    let day_of_week: number | null = null
    let date: string | null = null
    if (type === 'recurring') {
      if (!Number.isInteger(body.day_of_week) || (body.day_of_week as number) < 0 || (body.day_of_week as number) > 6) {
        return bad('day_of_week must be 0-6')
      }
      day_of_week = body.day_of_week as number
    } else {
      if (typeof body.date !== 'string' || !DATE_RE.test(body.date)) return bad('date is required (YYYY-MM-DD)')
      date = body.date
    }

    const { data, error } = await supabaseAdmin
      .from('career_availability')
      .insert({
        mentor_id: mentorId,
        service_id: null,
        type,
        day_of_week,
        date,
        start_time: body.start_time,
        end_time: body.end_time,
        active: body.active !== false,
      })
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? [])[0] ?? null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const actor = await getCareerActor()
  if (!actor) return forbidden()
  try {
    const body = await req.json() as Record<string, unknown>
    const id = body.id
    if (typeof id !== 'string' || !id) return bad('Missing id')

    const row = await ownerOf(id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canManageMentor(actor, row.mentor_id)) return forbidden()

    // Only these fields change: never mentor_id (a row cannot be moved to another mentor).
    const fields: Record<string, unknown> = {}
    if (typeof body.active === 'boolean') fields.active = body.active
    if ('start_time' in body) { if (!validTime(body.start_time)) return bad('Invalid start_time'); fields.start_time = body.start_time }
    if ('end_time' in body) { if (!validTime(body.end_time)) return bad('Invalid end_time'); fields.end_time = body.end_time }
    if (Object.keys(fields).length === 0) return bad('Nothing to update')
    if (typeof fields.start_time === 'string' && typeof fields.end_time === 'string'
        && minutes(fields.end_time) <= minutes(fields.start_time)) return bad('end_time must be after start_time')

    const { data, error } = await supabaseAdmin
      .from('career_availability')
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
  const actor = await getCareerActor()
  if (!actor) return forbidden()
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return bad('Missing id')

    const row = await ownerOf(id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canManageMentor(actor, row.mentor_id)) return forbidden()

    const { error } = await supabaseAdmin.from('career_availability').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
