import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email!)
      .maybeSingle()

    const { data: memberRow } = await supabase
      .from('club_members')
      .select('role')
      .eq('email', user.email!)
      .maybeSingle()

    const isAuthorized = !!adminRow || memberRow?.role === 'bod' || memberRow?.role === 'director'
    if (!isAuthorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { email } = await req.json()
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
      .from('admin_users')
      .delete()
      .eq('email', email)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
