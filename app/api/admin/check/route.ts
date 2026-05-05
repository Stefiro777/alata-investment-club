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
  console.log('ADMIN CHECK - user:', user?.email ?? 'null')
  if (!user) return NextResponse.json({ allowed: false })

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  console.log('ADMIN CHECK - member:', JSON.stringify(member))
  const allowed = member?.role === 'bod' || member?.role === 'director'
  console.log('ADMIN CHECK - allowed:', allowed)
  return NextResponse.json({ allowed })
}
