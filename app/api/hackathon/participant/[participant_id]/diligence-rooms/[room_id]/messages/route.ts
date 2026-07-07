import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const ATTACHMENTS_BUCKET = 'hackathon-attachments'
const SIGNED_URL_TTL = 60 * 60 * 2 // 2 hours
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ participant_id: string; room_id: string }> }
) {
  try {
    const { participant_id, room_id } = await params
    if (!participant_id || !room_id) {
      return NextResponse.json({ error: 'Missing participant_id or room_id' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: participant, error: participantError } = await supabase
      .from('hackathon_participants')
      .select('id, session_id, role_key')
      .eq('id', participant_id)
      .maybeSingle()

    if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 })
    if (!participant) return NextResponse.json({ error: 'Partecipante non trovato' }, { status: 404 })

    const { data: room, error: roomError } = await supabase
      .from('hackathon_diligence_rooms')
      .select('id, session_id, buy_side_role')
      .eq('id', room_id)
      .maybeSingle()

    if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 })
    if (!room) return NextResponse.json({ error: 'Stanza non trovata' }, { status: 404 })

    if (room.session_id !== participant.session_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const canAccess = participant.role_key === 'sell_side' || participant.role_key === room.buy_side_role
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const message = (formData.get('message') as string | null)?.trim()
    const file = formData.get('attachment')

    if (!message && !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing message or attachment' }, { status: 400 })
    }

    let attachmentPath: string | null = null
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
      }
      const safeName = file.name.replace(/\s+/g, '_')
      const path = `${room_id}/${randomUUID()}-${safeName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { data: uploaded, error: uploadError } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .upload(path, buffer, { contentType: file.type, upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      attachmentPath = uploaded.path
    }

    const { data: inserted, error: insertError } = await supabase
      .from('hackathon_diligence_messages')
      .insert({
        room_id,
        sender_role: participant.role_key,
        message: message ?? '',
        attachment_path: attachmentPath,
      })
      .select('id, sender_role, message, attachment_path, created_at')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    let attachment_url: string | null = null
    if (inserted.attachment_path) {
      const { data: signed } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(inserted.attachment_path, SIGNED_URL_TTL)
      attachment_url = signed?.signedUrl ?? null
    }

    return NextResponse.json({
      id: inserted.id,
      sender_role: inserted.sender_role,
      message: inserted.message,
      attachment_url,
      created_at: inserted.created_at,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
