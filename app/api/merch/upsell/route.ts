import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data: items, error } = await supabase
    .from('merch_upsell_items')
    .select('id, type, reference_id, label, priority')
    .eq('active', true)
    .order('priority', { ascending: false })
    .limit(3)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!items?.length) return NextResponse.json({ items: [] })

  const productIds = items.filter(i => i.type === 'product').map(i => i.reference_id)
  const eventIds   = items.filter(i => i.type === 'event').map(i => i.reference_id)

  const [productsRes, eventsRes] = await Promise.all([
    productIds.length
      ? supabase
          .from('products')
          .select('id, name, price_cents, product_variants(images, sort_order)')
          .in('id', productIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from('upcoming_events')
          .select('id, title, date')
          .in('id', eventIds)
      : Promise.resolve({ data: [] }),
  ])

  const productMap = new Map((productsRes.data ?? []).map((p: Record<string, unknown>) => [p.id, p]))
  const eventMap   = new Map((eventsRes.data   ?? []).map((e: Record<string, unknown>) => [e.id, e]))

  const result = items.map(item => {
    if (item.type === 'product') {
      const p = productMap.get(item.reference_id) as {
        id: string; name: string; price_cents: number
        product_variants: { images: string[] | null; sort_order: number }[]
      } | undefined
      if (!p) return null
      const variants = [...(p.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      const image = variants[0]?.images?.[0] ?? null
      return {
        id:           item.id,
        type:         'product' as const,
        referenceId:  item.reference_id,
        label:        item.label ?? null,
        name:         p.name,
        price_cents:  p.price_cents,
        image,
      }
    } else {
      const ev = eventMap.get(item.reference_id) as {
        id: string; title: string; date: string
      } | undefined
      if (!ev) return null
      return {
        id:          item.id,
        type:        'event' as const,
        referenceId: item.reference_id,
        label:       item.label ?? null,
        name:        ev.title,
        price_cents: null,
        image:       null,
        eventDate:   ev.date,
      }
    }
  }).filter(Boolean)

  return NextResponse.json({ items: result })
}
