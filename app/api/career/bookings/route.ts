import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getCareerActor, canManageMentor } from '@/lib/career-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Bookings for the dashboard. Staff see every booking (optionally filtered by
 * mentor_id); a mentor only their own: `mentor_id` is forced to their profile and
 * asking for someone else's is a 403. Legacy bookings (made when sessions were
 * tied to a service) carry a service_name and no mentor.
 */
export async function GET(req: NextRequest) {
  const actor = await getCareerActor()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const requested = req.nextUrl.searchParams.get('mentor_id')
    if (requested && !canManageMentor(actor, requested)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const mentorId = requested ?? (actor.staff ? null : actor.mentorId)

    let query = supabaseAdmin
      .from('career_bookings')
      .select('*, career_services(name), career_mentors(full_name)')
      .order('slot_date', { ascending: false })
    if (mentorId) query = query.eq('mentor_id', mentorId)
    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = (data ?? []).map((r) => {
      const { career_services, career_mentors, ...booking } = r as Record<string, unknown> & {
        career_services: { name: string } | null
        career_mentors: { full_name: string } | null
      }
      return {
        ...booking,
        // Payment identifiers are for staff only.
        ...(actor.staff ? {} : { stripe_payment_intent_id: null }),
        service_name: career_services?.name ?? null,
        mentor_name: career_mentors?.full_name ?? null,
      }
    })
    return NextResponse.json({ data: rows })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
