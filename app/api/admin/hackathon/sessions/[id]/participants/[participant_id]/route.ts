import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const
const MAX_PER_ROLE = 4

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participant_id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id, participant_id } = await params
    if (!id || !participant_id) return NextResponse.json({ error: 'Missing id or participant_id' }, { status: 400 })

    const body = await request.json() as { role_key?: string }
    const roleKey = body.role_key
    if (!roleKey || !ROLES.includes(roleKey as (typeof ROLES)[number])) {
      return NextResponse.json({ error: 'Invalid role_key' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: participant, error: participantError } = await supabase
      .from('hackathon_participants')
      .select('id, session_id')
      .eq('id', participant_id)
      .eq('session_id', id)
      .maybeSingle()

    if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 })
    if (!participant) return NextResponse.json({ error: 'Partecipante non trovato' }, { status: 404 })

    const { count, error: countError } = await supabase
      .from('hackathon_participants')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', id)
      .eq('role_key', roleKey)
      .neq('id', participant_id)

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })

    const warning = (count ?? 0) >= MAX_PER_ROLE

    const { data: updated, error: updateError } = await supabase
      .from('hackathon_participants')
      .update({ role_key: roleKey })
      .eq('id', participant_id)
      .select('id, name, role_key, joined_at')
      .single()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ participant: updated, warning })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
