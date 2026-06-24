import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: product, error } = await supabase
    .from('products')
    .select(`
      id, slug, name, price_cents, description, sizes, details, visible,
      product_variants (id, color, color_hex, images, sort_order),
      product_text_variants (id, option, sort_order)
    `)
    .eq('slug', slug)
    .eq('visible', true)
    .single()

  if (error || !product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product })
}
