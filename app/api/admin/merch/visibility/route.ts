import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Merch admin: privileged roles (bod/director) or media team
const isAdmin = async () => !!(await requireTeamAccess('media'))

// GET — read current visibility
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data } = await supabase
    .from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()
  const visible = data?.value === 'true'
  return NextResponse.json({ visible })
}

// POST — update visibility
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { visible } = await req.json()
  const { error } = await supabase
    .from('settings')
    .upsert({ key: 'merch_page_visible', value: visible ? 'true' : 'false' }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, visible })
}
