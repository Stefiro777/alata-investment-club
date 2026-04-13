import { createClient } from '@/lib/supabase-server'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type === 'recovery') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })

    if (!error) {
      return NextResponse.redirect(`${origin}/reset-password`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=link_invalido`)
}
