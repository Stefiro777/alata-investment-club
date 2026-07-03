import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shared privileged-access check (bod/director)
const isAdmin = async () => !!(await requirePrivilegedAccess())

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const search = url.searchParams.get('search')

  let query = supabase.from('crm_customers').select('*').order('purchased_at', { ascending: false })
  if (type && type !== 'all') query = query.eq('type', type)
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customers: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { name, email, phone, type, reference, amount, purchased_at, notes } = body
  if (!name || !email || !type) return NextResponse.json({ error: 'name, email, type required' }, { status: 400 })

  const { data, error } = await supabase.from('crm_customers').insert({
    name, email, phone: phone || null, type, reference: reference || null,
    amount: amount ?? null, purchased_at: purchased_at || new Date().toISOString(),
    notes: notes || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customer: data })
}
