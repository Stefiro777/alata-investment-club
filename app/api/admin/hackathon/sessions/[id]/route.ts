import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const BUY_ROLES = ['buy_side_1', 'buy_side_2', 'buy_side_3'] as const
const VALID_STATUSES = ['draft', 'active', 'closed'] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await request.json() as { status?: string; current_phase?: number }
    const updates: Record<string, string | number> = {}

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body.current_phase !== undefined) {
      if (typeof body.current_phase !== 'number' || body.current_phase < 0) {
        return NextResponse.json({ error: 'Invalid current_phase' }, { status: 400 })
      }
      updates.current_phase = body.current_phase
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: existing, error: existingError } = await supabase
      .from('hackathon_sessions')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 })

    const { data: updated, error: updateError } = await supabase
      .from('hackathon_sessions')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    if (updates.status === 'active' && existing.status !== 'active') {
      const { data: existingRooms, error: roomsError } = await supabase
        .from('hackathon_diligence_rooms')
        .select('buy_side_role')
        .eq('session_id', id)

      if (roomsError) return NextResponse.json({ error: roomsError.message }, { status: 500 })

      const existingRoles = new Set((existingRooms ?? []).map((r) => r.buy_side_role))
      const missing = BUY_ROLES.filter((role) => !existingRoles.has(role))

      if (missing.length > 0) {
        const { error: insertRoomsError } = await supabase
          .from('hackathon_diligence_rooms')
          .insert(missing.map((role) => ({ session_id: id, buy_side_role: role })))

        if (insertRoomsError) return NextResponse.json({ error: insertRoomsError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ session: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
