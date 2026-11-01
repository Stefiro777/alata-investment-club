import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import * as path from 'path'
import { loadLogoPNG, buildQuotePDF } from '@/lib/quote-pdf'
import type { QuoteData } from '@/lib/quote-pdf'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // BoD and Management only (Finance lives in the Board panel).
  if (!(await requirePrivilegedAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to, subject, quote } = (await req.json()) as { to: string; subject: string; quote: QuoteData }
  if (!to || !quote) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const logo = loadLogoPNG(path.join(process.cwd(), 'public', 'white-black.png'))
  const pdf = buildQuotePDF(quote, logo)

  const { error } = await resend.emails.send({
    from: 'Alata Investment Club <noreply@alatainvestmentclub.com>',
    to,
    subject: subject || `Preventivo ${quote.number} — Alata Investment Club`,
    html: `<p>Gentile ${quote.recipient_name},</p>
<p>In allegato il preventivo <strong>${quote.number}</strong> relativo a: <em>${quote.subject}</em>.</p>
<p>Per qualsiasi domanda siamo a disposizione.</p>
<br>
<p>Cordiali saluti,<br><strong>Alata Investment Club</strong><br>
<a href="https://alatainvestmentclub.com">alatainvestmentclub.com</a></p>`,
    attachments: [{
      filename: `preventivo-${quote.number}.pdf`,
      content: pdf.toString('base64'),
    }],
  })

  if (error) return NextResponse.json({ error: (error as { message?: string }).message ?? 'Send failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
