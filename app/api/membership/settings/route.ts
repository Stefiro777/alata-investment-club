import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shared privileged-access check (bod/director)
const isAdmin = async () => !!(await requirePrivilegedAccess())

export async function GET() {
  const { data } = await supabaseAdmin
    .from('membership_settings')
    .select('*')
    .limit(1)
    .single()
  return NextResponse.json({ settings: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { price_cents, stripe_price_id, description } = body

  // Get existing row id
  const { data: existing } = await supabaseAdmin
    .from('membership_settings')
    .select('id')
    .limit(1)
    .single()

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (price_cents !== undefined) payload.price_cents = price_cents
  if (stripe_price_id !== undefined) payload.stripe_price_id = stripe_price_id
  if (description !== undefined) payload.description = description

  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from('membership_settings')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  } else {
    const { data, error } = await supabaseAdmin
      .from('membership_settings')
      .insert({ ...payload })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ settings: data })
  }
}
