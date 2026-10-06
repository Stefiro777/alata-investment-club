import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'
import { getCareerActor, canManageMentor } from '@/lib/career-auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

const STATUSES = ['pending_payment', 'confirmed', 'cancelled']

/**
 * Staff can set any status. A mentor can only cancel their own bookings (never
 * confirm or reopen them). Cancelling does not refund: refunds are made from the
 * Finance panel.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await getCareerActor()
  if (!actor) return forbidden()
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await req.json() as { status?: string }
    if (!body.status || !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Missing or invalid status' }, { status: 400 })
    }

    const { data: booking } = await supabaseAdmin.from('career_bookings').select('mentor_id').eq('id', id).maybeSingle()
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (!canManageMentor(actor, booking.mentor_id)) return forbidden()
    if (!actor.staff && body.status !== 'cancelled') return forbidden()

    const { data, error } = await supabaseAdmin
      .from('career_bookings')
      .update({ status: body.status })
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? [])[0] ?? null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

// Deleting a booking is staff only: a mentor can cancel, not erase history.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('career_bookings')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
