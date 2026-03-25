import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    console.log('ENV CHECK:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING',
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'MISSING',
    })

    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('Starting invite for:', email)
    console.log('Redirect URL:', `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`)

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/accept-invite`,
    })
    console.log('Supabase response:', JSON.stringify({ data, error }))

    if (error) {
      console.error('INVITE ERROR:', error.message, error.status, error.code, error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('CRASH:', err)
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 })
  }
}
