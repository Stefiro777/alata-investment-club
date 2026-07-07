import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export function getJudgeCodeFromRequest(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('judge_code') ?? request.headers.get('x-judge-code')
}

export async function verifyJudgeSession(
  supabase: SupabaseClient,
  sessionId: string,
  judgeCode: string | null
): Promise<boolean> {
  if (!judgeCode) return false
  const { data, error } = await supabase
    .from('hackathon_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('judge_code', judgeCode)
    .maybeSingle()

  if (error) return false
  return !!data
}
