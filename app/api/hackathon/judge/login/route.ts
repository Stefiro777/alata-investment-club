import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { judge_code?: string }
    const judgeCode = body.judge_code?.trim()
    if (!judgeCode) return NextResponse.json({ error: 'Missing judge_code' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: session, error } = await supabase
      .from('hackathon_sessions')
      .select('id, case_name')
      .eq('judge_code', judgeCode)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!session) return NextResponse.json({ error: 'Codice giudice non valido' }, { status: 404 })

    return NextResponse.json({ session_id: session.id, case_name: session.case_name })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
