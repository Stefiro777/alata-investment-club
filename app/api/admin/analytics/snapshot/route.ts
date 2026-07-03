import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shared privileged-access check (bod/director)
const checkAuth = requirePrivilegedAccess

export async function POST(req: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { quarter_number?: number; year?: number; kpi_data?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { quarter_number, year, kpi_data } = body
  if (!quarter_number || !year || !kpi_data) {
    return NextResponse.json({ error: 'Missing quarter_number, year, or kpi_data' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('analytics_quarter_snapshots')
    .insert({ quarter_number, year, kpi_data })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
