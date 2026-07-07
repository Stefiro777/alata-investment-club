import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyJudgeSession } from '@/lib/hackathon-judge'
import { getRubricForRole } from '@/lib/hackathon-rubric'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id } = await params
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

    const body = await request.json() as {
      judge_code?: string
      judge_name?: string
      role_key?: string
      scores?: { criterion?: string; score?: number }[]
    }

    const supabase = createServiceClient()

    if (!(await verifyJudgeSession(supabase, session_id, body.judge_code ?? null))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const judgeName = body.judge_name?.trim()
    const roleKey = body.role_key
    if (!judgeName) return NextResponse.json({ error: 'Missing judge_name' }, { status: 400 })
    if (!roleKey) return NextResponse.json({ error: 'Missing role_key' }, { status: 400 })

    const rubric = getRubricForRole(roleKey)
    if (!rubric) return NextResponse.json({ error: 'Invalid role_key' }, { status: 400 })

    if (!Array.isArray(body.scores) || body.scores.length === 0) {
      return NextResponse.json({ error: 'Missing scores' }, { status: 400 })
    }

    const rows: { session_id: string; role_key: string; criterion: string; weight: number; score: number; judge_name: string }[] = []
    for (const s of body.scores) {
      if (!s.criterion || !(s.criterion in rubric)) {
        return NextResponse.json({ error: `Invalid criterion: ${s.criterion}` }, { status: 400 })
      }
      if (typeof s.score !== 'number' || s.score < 0 || s.score > 100) {
        return NextResponse.json({ error: `Invalid score for ${s.criterion}` }, { status: 400 })
      }
      rows.push({
        session_id,
        role_key: roleKey,
        criterion: s.criterion,
        weight: rubric[s.criterion],
        score: s.score,
        judge_name: judgeName,
      })
    }

    // Replace this judge's previous scores for this role so resubmission corrects rather than duplicates.
    const { error: deleteError } = await supabase
      .from('hackathon_scores')
      .delete()
      .eq('session_id', session_id)
      .eq('role_key', roleKey)
      .eq('judge_name', judgeName)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

    const { data: inserted, error: insertError } = await supabase
      .from('hackathon_scores')
      .insert(rows)
      .select('*')

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ scores: inserted ?? [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
