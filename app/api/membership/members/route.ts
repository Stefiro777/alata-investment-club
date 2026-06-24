import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(token: string | null): Promise<boolean> {
  if (!token) return false
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return false
  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email ?? '')
    .maybeSingle()
  return member?.role === 'bod' || member?.role === 'director' || (user.email ?? null) === 'finullistefano@gmail.com'
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('club_members')
    .select('id, full_name, email, role, membership_expires_at')
    .order('full_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? null
  if (!(await isAdmin(token))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, membership_expires_at } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('club_members')
    .update({ membership_expires_at })
    .eq('id', id)
    .select('id, full_name, email, membership_expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
