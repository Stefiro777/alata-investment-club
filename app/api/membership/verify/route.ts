import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ valid: false })

  const { data } = await supabase
    .from('club_members')
    .select('full_name, role, membership_expires_at')
    .eq('member_id', id)
    .maybeSingle()

  if (!data) return NextResponse.json({ valid: false })

  const valid = !!data.membership_expires_at && new Date(data.membership_expires_at) > new Date()
  if (!valid) return NextResponse.json({ valid: false })

  return NextResponse.json({
    valid: true,
    name: data.full_name,
    role: data.role,
    expires_at: data.membership_expires_at,
  })
}
