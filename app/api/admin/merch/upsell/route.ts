import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shared privileged-access check (bod/director)
const isAdmin = async () => !!(await requirePrivilegedAccess())

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: items, error } = await supabase
    .from('merch_upsell_items')
    .select('id, type, reference_id, label, priority, active, created_at')
    .order('priority', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!items?.length) return NextResponse.json({ items: [] })

  const productIds = items.filter(i => i.type === 'product').map(i => i.reference_id)
  const eventIds   = items.filter(i => i.type === 'event').map(i => i.reference_id)

  const [pRes, eRes] = await Promise.all([
    productIds.length
      ? supabase.from('products').select('id, name, price_cents').in('id', productIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase.from('upcoming_events').select('id, title, date').in('id', eventIds)
      : Promise.resolve({ data: [] }),
  ])

  const pm = new Map((pRes.data ?? []).map((p: Record<string, unknown>) => [p.id, p]))
  const em = new Map((eRes.data ?? []).map((e: Record<string, unknown>) => [e.id, e]))

  const result = items.map(item => {
    const ref = item.type === 'product' ? pm.get(item.reference_id) : em.get(item.reference_id)
    return {
      ...item,
      resolvedName: item.type === 'product'
        ? (ref as { name?: string })?.name ?? '—'
        : (ref as { title?: string })?.title ?? '—',
      resolvedPrice: item.type === 'product'
        ? (ref as { price_cents?: number })?.price_cents ?? null
        : null,
      resolvedDate: item.type === 'event'
        ? (ref as { date?: string })?.date ?? null
        : null,
    }
  })

  return NextResponse.json({ items: result })
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { type, reference_id, label, priority } = await req.json()
  if (!type || !reference_id) return NextResponse.json({ error: 'type and reference_id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('merch_upsell_items')
    .insert({ type, reference_id, label: label || null, priority: priority ?? 0, active: true })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase
    .from('merch_upsell_items').update(fields).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('merch_upsell_items').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
