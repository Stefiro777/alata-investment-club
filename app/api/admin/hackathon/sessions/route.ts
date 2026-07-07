import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('hackathon_sessions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json() as { case_name?: string; access_code?: string; judge_code?: string }
    const caseName = body.case_name?.trim()
    const accessCode = body.access_code?.trim()
    const judgeCode = body.judge_code?.trim()

    if (!caseName) return NextResponse.json({ error: 'Missing case_name' }, { status: 400 })
    if (!accessCode) return NextResponse.json({ error: 'Missing access_code' }, { status: 400 })
    if (!judgeCode) return NextResponse.json({ error: 'Missing judge_code' }, { status: 400 })

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('hackathon_sessions')
      .insert({
        case_name: caseName,
        access_code: accessCode,
        judge_code: judgeCode,
        status: 'draft',
        current_phase: 0,
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ session: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
