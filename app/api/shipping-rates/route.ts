import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/shipping-rates — public
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('shipping_rates')
    .select('zone, price_cents')
    .order('zone')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rates: data ?? [] })
}

// PATCH /api/shipping-rates — admin only { zone, price_cents }
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('club_members').select('role').eq('email', user.email!).maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { zone, price_cents } = await req.json() as { zone: string; price_cents: number }
  if (!zone || price_cents == null) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('shipping_rates')
    .update({ price_cents, updated_at: new Date().toISOString() })
    .eq('zone', zone)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
