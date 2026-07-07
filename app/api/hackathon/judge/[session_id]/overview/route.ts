import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getJudgeCodeFromRequest, verifyJudgeSession } from '@/lib/hackathon-judge'
import type { SupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ATTACHMENTS_BUCKET = 'hackathon-attachments'
const SUBMISSIONS_BUCKET = 'hackathon-submissions'
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
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id } = await params
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

    const supabase = createServiceClient()
    const judgeCode = getJudgeCodeFromRequest(request)

    if (!(await verifyJudgeSession(supabase, session_id, judgeCode))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [mandatesRes, fairValueRes, roomsRes, submissionsRes] = await Promise.all([
      supabase.from('hackathon_mandates').select('*').eq('session_id', session_id),
      supabase.from('hackathon_fair_value').select('*').eq('session_id', session_id).maybeSingle(),
      supabase.from('hackathon_diligence_rooms').select('id, buy_side_role').eq('session_id', session_id),
      supabase.from('hackathon_submissions').select('*').eq('session_id', session_id).order('phase_number', { ascending: true }),
    ])

    if (mandatesRes.error) return NextResponse.json({ error: mandatesRes.error.message }, { status: 500 })
    if (fairValueRes.error) return NextResponse.json({ error: fairValueRes.error.message }, { status: 500 })
    if (roomsRes.error) return NextResponse.json({ error: roomsRes.error.message }, { status: 500 })
    if (submissionsRes.error) return NextResponse.json({ error: submissionsRes.error.message }, { status: 500 })

    const rooms = await Promise.all(
      (roomsRes.data ?? []).map(async (room) => ({
        id: room.id,
        buy_side_role: room.buy_side_role,
        messages: await attachMessages(supabase, room.id),
      }))
    )

    const submissions = await Promise.all(
      (submissionsRes.data ?? []).map(async (s) => {
        let file_url: string | null = null
        if (s.file_path) {
          const { data: signed } = await supabase.storage
            .from(SUBMISSIONS_BUCKET)
            .createSignedUrl(s.file_path, SIGNED_URL_TTL)
          file_url = signed?.signedUrl ?? null
        }
        return { ...s, file_url }
      })
    )

    return NextResponse.json({
      mandates: mandatesRes.data ?? [],
      fair_value: fairValueRes.data ?? { session_id, content: '', valuation_range: '' },
      rooms,
      submissions,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
