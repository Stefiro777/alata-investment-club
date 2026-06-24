import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ProductClient from './ProductClient'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabase.from('products').select('name').eq('slug', slug).single()
  return { title: data?.name ? `${data.name} — Alata Merch` : 'Alata Merch' }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  // Check visibility
  const { data: setting } = await supabase
    .from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()
  if (!setting || setting.value !== 'true') notFound()

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, slug, name, price_cents, description, sizes, details, visible,
      product_variants (id, color, color_hex, images, sort_order),
      product_text_variants (id, option, sort_order)
    `)
    .eq('slug', slug)
    .eq('visible', true)
    .single()

  if (!product) notFound()
  return <ProductClient product={product as Parameters<typeof ProductClient>[0]['product']} />
}
