import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const
const MAX_PER_ROLE = 4

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { access_code?: string; name?: string }
    const accessCode = body.access_code?.trim()
    const name = body.name?.trim()

    if (!accessCode) return NextResponse.json({ error: 'Missing access_code' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: session, error: sessionError } = await supabase
      .from('hackathon_sessions')
      .select('id, current_phase, status')
      .eq('access_code', accessCode)
      .eq('status', 'active')
      .maybeSingle()

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })
    if (!session) {
      return NextResponse.json({ error: 'Codice non valido o sessione non attiva' }, { status: 404 })
    }

    const { data: participants, error: participantsError } = await supabase
      .from('hackathon_participants')
      .select('role_key')
      .eq('session_id', session.id)

    if (participantsError) return NextResponse.json({ error: participantsError.message }, { status: 500 })

    const counts: Record<string, number> = { sell_side: 0, buy_side_1: 0, buy_side_2: 0, buy_side_3: 0 }
    for (const p of participants ?? []) {
      if (p.role_key in counts) counts[p.role_key]++
    }

    const eligible = ROLES.filter((role) => counts[role] < MAX_PER_ROLE)
    if (eligible.length === 0) {
      return NextResponse.json({ error: 'Sessione al completo' }, { status: 409 })
    }

    const minCount = Math.min(...eligible.map((role) => counts[role]))
    const candidates = eligible.filter((role) => counts[role] === minCount)
    const assignedRole = candidates[Math.floor(Math.random() * candidates.length)]

    const { data: participant, error: insertError } = await supabase
      .from('hackathon_participants')
      .insert({ session_id: session.id, name, role_key: assignedRole })
      .select('id')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({
      participant_id: participant.id,
      session_id: session.id,
      role_key: assignedRole,
      current_phase: session.current_phase,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
