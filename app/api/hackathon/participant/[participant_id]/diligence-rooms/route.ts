import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const BUY_ROLES = ['buy_side_1', 'buy_side_2', 'buy_side_3'] as const
const ATTACHMENTS_BUCKET = 'hackathon-attachments'
const SIGNED_URL_TTL = 60 * 60 * 2 // 2 hours

async function ensureRooms(supabase: SupabaseClient, sessionId: string) {
  const { data: existing, error } = await supabase
    .from('hackathon_diligence_rooms')
    .select('id, buy_side_role')
    .eq('session_id', sessionId)

  if (error) throw new Error(error.message)

  const existingRoles = new Set((existing ?? []).map((r) => r.buy_side_role))
  const missing = BUY_ROLES.filter((role) => !existingRoles.has(role))

  if (missing.length > 0) {
    const { error: insertError } = await supabase
      .from('hackathon_diligence_rooms')
      .insert(missing.map((role) => ({ session_id: sessionId, buy_side_role: role })))

    if (insertError) throw new Error(insertError.message)
  }

  const { data: rooms, error: finalError } = await supabase
    .from('hackathon_diligence_rooms')
    .select('id, buy_side_role')
    .eq('session_id', sessionId)

  if (finalError) throw new Error(finalError.message)
  return rooms ?? []
}

async function attachMessages(supabase: SupabaseClient, roomId: string) {
  const { data: messages, error } = await supabase
    .from('hackathon_diligence_messages')
    .select('id, sender_role, message, attachment_path, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  return Promise.all(
    (messages ?? []).map(async (m) => {
      let attachment_url: string | null = null
      if (m.attachment_path) {
        const { data: signed } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .createSignedUrl(m.attachment_path, SIGNED_URL_TTL)
        attachment_url = signed?.signedUrl ?? null
      }
      return {
        id: m.id,
        sender_role: m.sender_role,
        message: m.message,
        attachment_url,
        created_at: m.created_at,
      }
    })
  )
}

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

    const rooms = await ensureRooms(supabase, participant.session_id)

    const visibleRooms =
      participant.role_key === 'sell_side'
        ? rooms
        : rooms.filter((r) => r.buy_side_role === participant.role_key)

    const roomsWithMessages = await Promise.all(
      visibleRooms.map(async (room) => ({
        id: room.id,
        buy_side_role: room.buy_side_role,
        messages: await attachMessages(supabase, room.id),
      }))
    )

    return NextResponse.json({ rooms: roomsWithMessages })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
