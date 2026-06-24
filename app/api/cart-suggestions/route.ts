import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = createServiceClient()

  const { data: suggestions, error } = await supabase
    .from('cart_suggestions')
    .select('id, type, reference_id, label, description, sort_order')
    .eq('visible', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich each suggestion with price + image from the referenced table
  const enriched = await Promise.all(
    (suggestions ?? []).map(async (s) => {
      if (s.type === 'career_service') {
        const { data: svc } = await supabase
          .from('career_services')
          .select('name, price_cents')
          .eq('id', s.reference_id)
          .single()
        return {
          ...s,
          price_cents: svc?.price_cents ?? 0,
          image_url: null,
          ref_name: svc?.name ?? s.label,
        }
      }

      if (s.type === 'merch_product') {
        // products table — handled when merch is introduced
        const { data: prod } = await supabase
          .from('products')
          .select('name, price_cents, image_url')
          .eq('id', s.reference_id)
          .maybeSingle()
        return {
          ...s,
          price_cents: prod?.price_cents ?? 0,
          image_url: prod?.image_url ?? null,
          ref_name: prod?.name ?? s.label,
        }
      }

      return { ...s, price_cents: 0, image_url: null, ref_name: s.label }
    })
  )

  return NextResponse.json({ suggestions: enriched })
}
