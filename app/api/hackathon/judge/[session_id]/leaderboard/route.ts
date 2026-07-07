import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const BUY_ROLES = ['buy_side_1', 'buy_side_2', 'buy_side_3']

function weightedScorePerJudge(rows: { score: number; weight: number; judge_name: string }[]) {
  const byJudge = new Map<string, { score: number; weight: number }[]>()
  for (const row of rows) {
    const list = byJudge.get(row.judge_name) ?? []
    list.push({ score: row.score, weight: row.weight })
    byJudge.set(row.judge_name, list)
  }

  const perJudgeScores: number[] = []
  for (const entries of byJudge.values()) {
    const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0)
    if (totalWeight === 0) continue
    const weighted = entries.reduce((sum, e) => sum + e.score * e.weight, 0) / totalWeight
    perJudgeScores.push(weighted)
  }

  if (perJudgeScores.length === 0) return null
  return perJudgeScores.reduce((sum, s) => sum + s, 0) / perJudgeScores.length
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ session_id: string }> }
) {
  try {
    const { session_id } = await params
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

    const supabase = createServiceClient()
    const { data: scores, error } = await supabase
      .from('hackathon_scores')
      .select('role_key, score, weight, judge_name')
      .eq('session_id', session_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const byRole = new Map<string, { score: number; weight: number; judge_name: string }[]>()
    for (const row of scores ?? []) {
      const list = byRole.get(row.role_key) ?? []
      list.push(row)
      byRole.set(row.role_key, list)
    }

    const buySide = BUY_ROLES.map((role) => ({
      role_key: role,
      weighted_score: weightedScorePerJudge(byRole.get(role) ?? []),
    })).sort((a, b) => (b.weighted_score ?? -1) - (a.weighted_score ?? -1))

    const sellSide = { weighted_score: weightedScorePerJudge(byRole.get('sell_side') ?? []) }

    return NextResponse.json({ buy_side: buySide, sell_side: sellSide })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
