import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(token: string | null) {
  if (!token) return false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  if (user.email === 'finullistefano@gmail.com') return true
  const { data: m } = await supabase.from('club_members').select('role').eq('email', user.email ?? '').maybeSingle()
  return m?.role === 'bod' || m?.role === 'director'
}
function tok(req: NextRequest) { return req.headers.get('authorization')?.replace('Bearer ', '') ?? null }

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { notes } = await req.json()
  const { data, error } = await supabase.from('crm_customers').update({ notes }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customer: data })
}
