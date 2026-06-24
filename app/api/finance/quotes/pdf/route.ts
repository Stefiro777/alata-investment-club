import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import * as path from 'path'
import { loadLogoPNG, buildQuotePDF } from '@/lib/quote-pdf'
import type { QuoteData } from '@/lib/quote-pdf'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q: QuoteData = await req.json()
  const logo = loadLogoPNG(path.join(process.cwd(), 'public', 'white.png'), [26, 74, 58])
  const pdf = buildQuotePDF(q, logo)

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="preventivo-${q.number}.pdf"`,
    },
  })
}
