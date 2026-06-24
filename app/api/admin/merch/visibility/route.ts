import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function authedUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!token) return null
  const { data: { user } } = await supabase.auth.getUser(token)
  return user ?? null
}

// GET — read current visibility (authenticated users only)
export async function GET(req: NextRequest) {
  if (!(await authedUser(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase
    .from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()
  const visible = data?.value === 'true'
  return NextResponse.json({ visible })
}

// POST — update visibility (authenticated users only)
export async function POST(req: NextRequest) {
  if (!(await authedUser(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { visible } = await req.json()
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'merch_page_visible', value: visible ? 'true' : 'false' }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, visible })
}
