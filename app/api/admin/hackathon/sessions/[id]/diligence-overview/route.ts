import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ATTACHMENTS_BUCKET = 'hackathon-attachments'
const SIGNED_URL_TTL = 60 * 60 * 2 // 2 hours

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
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = createServiceClient()

    const { data: rooms, error: roomsError } = await supabase
      .from('hackathon_diligence_rooms')
      .select('id, buy_side_role')
      .eq('session_id', id)
      .order('buy_side_role', { ascending: true })

    if (roomsError) return NextResponse.json({ error: roomsError.message }, { status: 500 })

    const roomsWithMessages = await Promise.all(
      (rooms ?? []).map(async (room) => ({
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
