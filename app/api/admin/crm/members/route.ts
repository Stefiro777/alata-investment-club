import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.email !== 'finullistefano@gmail.com') {
    const { data: member } = await supabaseAdmin
      .from('club_members')
      .select('role')
      .eq('email', user.email!)
      .maybeSingle()
    if (member?.role !== 'bod' && member?.role !== 'director') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabaseAdmin
    .from('club_members')
    .select('id, full_name, email, role, team, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
