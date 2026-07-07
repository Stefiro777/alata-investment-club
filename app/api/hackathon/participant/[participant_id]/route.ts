import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const MATERIALS_BUCKET = 'hackathon-materials'
const SIGNED_URL_TTL = 60 * 60 * 2 // 2 hours

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ participant_id: string }> }
) {
  try {
    const { participant_id } = await params
    if (!participant_id) return NextResponse.json({ error: 'Missing participant_id' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: participant, error: participantError } = await supabase
      .from('hackathon_participants')
      .select('id, session_id, role_key, name')
      .eq('id', participant_id)
      .maybeSingle()

    if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 })
    if (!participant) return NextResponse.json({ error: 'Partecipante non trovato' }, { status: 404 })

    const { data: session, error: sessionError } = await supabase
      .from('hackathon_sessions')
      .select('current_phase, status, case_name')
      .eq('id', participant.session_id)
      .maybeSingle()

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })
    if (!session) return NextResponse.json({ error: 'Sessione non trovata' }, { status: 404 })

    const { data: mandate, error: mandateError } = await supabase
      .from('hackathon_mandates')
      .select('content')
      .eq('session_id', participant.session_id)
      .eq('role_key', participant.role_key)
      .maybeSingle()

    if (mandateError) return NextResponse.json({ error: mandateError.message }, { status: 500 })

    const { data: materialsRows, error: materialsError } = await supabase
      .from('hackathon_materials')
      .select('id, title, file_path, phase_number')
      .eq('session_id', participant.session_id)
      .eq('role_key', participant.role_key)
      .eq('phase_number', session.current_phase)

    if (materialsError) return NextResponse.json({ error: materialsError.message }, { status: 500 })

    const materials = await Promise.all(
      (materialsRows ?? []).map(async (m) => {
        const { data: signed } = await supabase.storage
          .from(MATERIALS_BUCKET)
          .createSignedUrl(m.file_path, SIGNED_URL_TTL)
        return { id: m.id, title: m.title, url: signed?.signedUrl ?? null }
      })
    )

    return NextResponse.json({
      participant_id: participant.id,
      name: participant.name,
      role_key: participant.role_key,
      case_name: session.case_name,
      current_phase: session.current_phase,
      mandate: mandate?.content ?? null,
      materials,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
