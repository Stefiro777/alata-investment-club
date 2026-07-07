import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: participants, error } = await supabase
    .from('hackathon_participants')
    .select('id, name, role_key, joined_at')
    .eq('session_id', id)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts: Record<string, number> = { sell_side: 0, buy_side_1: 0, buy_side_2: 0, buy_side_3: 0 }
  for (const p of participants ?? []) {
    if (p.role_key in counts) counts[p.role_key]++
  }

  return NextResponse.json({
    participants: participants ?? [],
    counts,
    roles: ROLES,
  })
}
