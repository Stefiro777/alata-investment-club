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

/**
 * GET is shared between the public career-service page and the dashboard
 * Mentors tab: team career / bod / director callers (cookie session) get the
 * full admin listing (all mentors, all columns); everyone else gets the
 * public reduced view (active mentors only) with service_id resolved from
 * their own career_availability rows, since career_mentors has no service
 * column of its own. A mentor with no availability rows yet has service_id
 * null and is not bookable until the team adds one.
 */
export async function GET() {
  if (await requireTeamAccess('career')) {
    const { data, error } = await supabaseAdmin
      .from('career_mentors')
      .select('*')
      .order('display_order', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  }

  const { data: mentors, error } = await supabaseAdmin
    .from('career_mentors')
    .select('id, slug, full_name, role_title, photo_url, bio_short, bio_long, display_order')
    .eq('active', true)
    .order('display_order', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mentorIds = (mentors ?? []).map(m => m.id)
  const serviceByMentor = new Map<string, string>()
  if (mentorIds.length > 0) {
    const { data: availRows } = await supabaseAdmin
      .from('career_availability')
      .select('mentor_id, service_id')
      .in('mentor_id', mentorIds)
      .eq('active', true)
    for (const row of availRows ?? []) {
      if (row.mentor_id && row.service_id && !serviceByMentor.has(row.mentor_id)) {
        serviceByMentor.set(row.mentor_id, row.service_id)
      }
    }
  }

  const data = (mentors ?? []).map(m => ({ ...m, service_id: serviceByMentor.get(m.id) ?? null }))
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const body = await req.json()
    if (!body.full_name?.trim()) return NextResponse.json({ error: 'full_name is required' }, { status: 400 })
    if (!body.notification_email?.trim()) return NextResponse.json({ error: 'notification_email is required' }, { status: 400 })

    const slug = await uniqueSlug(supabaseAdmin, body.full_name, 'career_mentors')
    const { data, error } = await supabaseAdmin
      .from('career_mentors')
      .insert({ ...body, slug })
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
    const body = await req.json()
    const { id, ...fields } = body as { id: string; [key: string]: unknown }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

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
    const { error } = await supabaseAdmin.from('career_mentors').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
