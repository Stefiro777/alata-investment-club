import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify caller has admin access
    if (user.email !== 'finullistefano@gmail.com') {
      const { data: member } = await supabase
        .from('club_members').select('role').eq('email', user.email!).maybeSingle()
      if (member?.role !== 'bod' && member?.role !== 'director') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { email } = await req.json()
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: 'https://alatainvestmentclub.com/accept-invite',
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Supabase invite response:', JSON.stringify({ data, error }))
    }

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('INVITE ERROR:', error.message, error.status, error.code)
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 })
  }
}
