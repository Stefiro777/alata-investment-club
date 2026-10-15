import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isMerchPagePublished } from '@/lib/merch-visibility'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)


export async function GET() {
  if (!(await isMerchPagePublished(supabase))) return NextResponse.json({ products: [] })
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, price_cents, description, visible, stock, size_stock,
      product_variants (id, color, color_hex, images, sort_order, stock)
    `)
    .eq('visible', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: products ?? [] })
}
