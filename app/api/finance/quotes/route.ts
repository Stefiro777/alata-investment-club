import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(token: string | null) {
  if (!token) return false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  if (user.email === 'finullistefano@gmail.com') return true
  const { data: m } = await supabase.from('club_members').select('role').eq('email', user.email ?? '').maybeSingle()
  return m?.role === 'bod' || m?.role === 'director'
}
function tok(req: NextRequest) { return req.headers.get('authorization')?.replace('Bearer ', '') ?? null }

async function nextQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { data } = await supabase
    .from('quotes')
    .select('number')
    .like('number', `ALATA-${year}-%`)
    .order('created_at', { ascending: false })
    .limit(1)
  const last = data?.[0]?.number
  if (last) {
    const seq = parseInt(last.split('-')[2] ?? '0', 10) + 1
    return `ALATA-${year}-${String(seq).padStart(3, '0')}`
  }
  return `ALATA-${year}-001`
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quotes: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { recipient_name, recipient_email, recipient_org, subject, items, notes, issued_at } = body
  if (!recipient_name || !subject) return NextResponse.json({ error: 'recipient_name and subject required' }, { status: 400 })

  const total = (items ?? []).reduce((s: number, i: { qty: number; unit_price: number }) => s + (i.qty ?? 0) * (i.unit_price ?? 0), 0)
  const number = await nextQuoteNumber()

  const { data, error } = await supabase.from('quotes').insert({
    number, recipient_name, recipient_email: recipient_email || null,
    recipient_org: recipient_org || null, subject,
    items: items ?? [], total,
    notes: notes || null,
    issued_at: issued_at || new Date().toISOString().slice(0, 10),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ quote: data })
}
