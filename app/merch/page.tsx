import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

type Variant = { id: string; color: string; color_hex: string | null; images: string[] | null; sort_order: number }
type Product = {
  id: string; slug: string; name: string; price_cents: number; description: string | null
  product_variants: Variant[]
}

export default async function MerchPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const sp = await searchParams

  // Check visibility
  const { data: setting } = await supabase
    .from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()

  if (!setting || setting.value !== 'true') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-4">Alata Investment Club</p>
        <h1 className="font-['Cormorant_Garamond',serif] text-5xl md:text-7xl font-bold text-white leading-none mb-6">
          COMING<br />SOON
        </h1>
        <p className="text-sm text-gray-500 max-w-sm">
          Il nostro merch è in arrivo. Resta sintonizzato.
        </p>
      </div>
    )
  }

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('id, slug, name, price_cents, description, product_variants (id, color, color_hex, images, sort_order)')
    .eq('visible', true)
    .order('created_at', { ascending: false })

  const items = (products ?? []) as Product[]

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Success banner */}
      {sp.checkout === 'success' && (
        <div className="bg-[#1a4a3a] text-white text-center py-3 text-sm font-semibold tracking-wide">
          Ordine completato! Riceverai una conferma via email.
        </div>
      )}

      {/* Hero */}
      <div className="bg-black text-white py-24 px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400 mb-4">
          Alata Investment Club
        </p>
        <h1 className="font-['Cormorant_Garamond',serif] text-6xl md:text-8xl font-bold leading-none">
          WEAR THE CLUB
        </h1>
        <p className="text-sm text-gray-400 mt-6 max-w-md mx-auto">
          Prodotti selezionati per i membri e appassionati del club.
        </p>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        {items.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-24">
            Nessun prodotto disponibile al momento.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map(product => {
              const variants = [...(product.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
              const firstImg = variants[0]?.images?.[0] ?? null
              return (
                <Link
                  key={product.id}
                  href={`/merch/${product.slug}`}
                  className="group block"
                >
                  {/* Image */}
                  <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden mb-4">
                    {firstImg ? (
                      <Image
                        src={firstImg}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-gray-300 text-xs uppercase tracking-widest">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Color swatches */}
                  {variants.length > 0 && (
                    <div className="flex gap-1.5 mb-2">
                      {variants.slice(0, 6).map(v => (
                        <span
                          key={v.id}
                          className="w-4 h-4 border border-gray-300"
                          style={{ backgroundColor: v.color_hex ?? '#ccc' }}
                          title={v.color}
                        />
                      ))}
                    </div>
                  )}

                  {/* Info */}
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-widest group-hover:text-[#1a4a3a] transition-colors">
                    {product.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{fmtEur(product.price_cents)}</p>

                  <span className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1a4a3a] border border-[#1a4a3a] px-3 py-1 group-hover:bg-[#1a4a3a] group-hover:text-white transition-colors">
                    SCOPRI
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
