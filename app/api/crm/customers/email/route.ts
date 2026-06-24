import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

async function isAdmin(token: string | null) {
  if (!token) return false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  if (user.email === 'finullistefano@gmail.com') return true
  const { data: m } = await supabase.from('club_members').select('role').eq('email', user.email ?? '').maybeSingle()
  return m?.role === 'bod' || m?.role === 'director'
}
function tok(req: NextRequest) { return req.headers.get('authorization')?.replace('Bearer ', '') ?? null }

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function POST(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
