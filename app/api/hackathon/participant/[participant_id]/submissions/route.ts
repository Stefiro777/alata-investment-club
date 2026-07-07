import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const SUBMISSIONS_BUCKET = 'hackathon-submissions'

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
      .select('id, session_id, role_key')
      .eq('id', participant_id)
      .maybeSingle()

    if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 })
    if (!participant) return NextResponse.json({ error: 'Partecipante non trovato' }, { status: 404 })

    const { data: submissions, error: submissionsError } = await supabase
      .from('hackathon_submissions')
      .select('*')
      .eq('session_id', participant.session_id)
      .eq('role_key', participant.role_key)
      .order('phase_number', { ascending: true })

    if (submissionsError) return NextResponse.json({ error: submissionsError.message }, { status: 500 })
    return NextResponse.json({ submissions: submissions ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
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

    const formData = await req.formData()
    const phaseNumberRaw = formData.get('phase_number') as string | null
    const file = formData.get('file')
    const dealStructureRaw = formData.get('deal_structure') as string | null

    const phaseNumber = Number(phaseNumberRaw)
    if (!phaseNumberRaw || Number.isNaN(phaseNumber) || phaseNumber < 1) {
      return NextResponse.json({ error: 'Invalid phase_number' }, { status: 400 })
    }

    let dealStructure: unknown = null
    if (dealStructureRaw) {
      try {
        dealStructure = JSON.parse(dealStructureRaw)
      } catch {
        return NextResponse.json({ error: 'Invalid deal_structure JSON' }, { status: 400 })
      }
    }

    let filePath: string | null = null
    if (file instanceof File && file.size > 0) {
      const safeName = file.name.replace(/\s+/g, '_')
      const path = `${participant.session_id}/${phaseNumber}/${participant.role_key}/${Date.now()}-${safeName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(SUBMISSIONS_BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      filePath = uploaded.path
    }

    const { data: existing, error: existingError } = await supabase
      .from('hackathon_submissions')
      .select('id')
      .eq('session_id', participant.session_id)
      .eq('role_key', participant.role_key)
      .eq('phase_number', phaseNumber)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const payload: Record<string, unknown> = { submitted_by: participant.name }
    if (filePath) payload.file_path = filePath
    if (dealStructureRaw) payload.deal_structure = dealStructure

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('hackathon_submissions')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      return NextResponse.json({ submission: updated })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('hackathon_submissions')
      .insert({
        session_id: participant.session_id,
        phase_number: phaseNumber,
        role_key: participant.role_key,
        file_path: filePath,
        deal_structure: dealStructure,
        submitted_by: participant.name,
      })
      .select('*')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ submission: inserted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
