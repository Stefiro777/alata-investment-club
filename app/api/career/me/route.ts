import { NextRequest, NextResponse } from 'next/server'
import { getCareerActor } from '@/lib/career-auth'
import { createServiceClient } from '@/lib/supabase-server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * The mentor profile linked to the logged-in account (career_mentors.member_id).
 * `linked: false` means the account has no mentor profile (yet); the page then
 * shows a "not linked" message. Used by the dashboard nav to decide whether to show
 * the "I miei orari" link.
 */
export async function GET() {
  const actor = await getCareerActor()
  if (!actor?.mentorId) return NextResponse.json({ linked: false, staff: actor?.staff ?? false })

  const { data: mentor } = await createServiceClient()
    .from('career_mentors')
    .select('id, full_name, role_title, notification_email, active, photo_url')
    .eq('id', actor.mentorId)
    .single()
  return NextResponse.json({ linked: !!mentor, staff: actor.staff, mentor })
}

/** A mentor edits only their own notification email: nothing else, whatever the body says. */
export async function PATCH(req: NextRequest) {
  const actor = await getCareerActor()
  if (!actor?.mentorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const body = await req.json() as { notification_email?: unknown }
    const email = typeof body.notification_email === 'string' ? body.notification_email.trim() : ''
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Email non valida.' }, { status: 400 })

    const { data, error } = await createServiceClient()
      .from('career_mentors')
      .update({ notification_email: email })
      .eq('id', actor.mentorId)
      .select('id, notification_email')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
