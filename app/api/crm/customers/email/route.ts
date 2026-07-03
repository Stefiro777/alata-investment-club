import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function POST(req: NextRequest) {
  if (!(await requirePrivilegedAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { ids, subject, body } = await req.json()
  if (!ids?.length || !subject || !body) return NextResponse.json({ error: 'ids, subject, body required' }, { status: 400 })

  const { data: customers, error } = await supabase.from('crm_customers').select('id,name,email').in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results: { email: string; ok: boolean; error?: string }[] = []
  for (const c of customers ?? []) {
    try {
      await resend.emails.send({ from: FROM, to: c.email, subject, html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7">${body.replace(/\n/g,'<br/>')}</div>` })
      results.push({ email: c.email, ok: true })
    } catch (e) {
      results.push({ email: c.email, ok: false, error: String(e) })
    }
    await delay(300)
  }

  return NextResponse.json({ sent: results.filter(r => r.ok).length, total: results.length, results })
}
