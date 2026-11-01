import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import ProductClient from './ProductClient'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data } = await supabase.from('products').select('name').eq('slug', slug).eq('visible', true).maybeSingle()
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
      id, slug, name, price_cents, description, sizes, details, visible, stock, size_stock,
      product_variants (id, color, color_hex, images, sort_order, stock),
      product_text_variants (id, option, sort_order)
    `)
    .eq('slug', slug)
    .eq('visible', true)
    .single()

  if (!product) notFound()
  return (
    <>
      <div className="relative min-h-[100svh] bg-ivory text-night">
        <SiteNav tone="light" />
        <div className="rd-gutter pb-20 pt-[clamp(96px,10vw,110px)]">
          <ProductClient product={product as Parameters<typeof ProductClient>[0]['product']} />
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
