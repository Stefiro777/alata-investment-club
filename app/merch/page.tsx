import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Image from 'next/image'
import Link from 'next/link'
import Parallax from '@/app/components/Parallax'
import Reveal from '@/app/components/Reveal'

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
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#1a4a3a] mb-4">
          Alata Investment Club
        </p>
        <h1 className="font-serif text-5xl md:text-7xl font-bold text-white leading-none mb-6">
          COMING SOON
        </h1>
        <div className="w-10 h-px bg-white/30 mx-auto mb-6" />
        <p className="text-base text-white/60 max-w-sm">
          Our merch is on its way. Stay tuned.
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
    <div className="bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Success banner */}
      {sp.checkout === 'success' && (
        <div className="bg-[#1a4a3a] text-white text-center py-3 text-sm font-semibold tracking-wide">
          Order confirmed — a receipt has been sent to your email.
        </div>
      )}

      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] flex items-center justify-center text-white overflow-hidden">
        <Parallax>
          <Image
            src="/redesign/teatro-hd.jpg"
            alt=""
            fill
            className="object-cover grayscale animate-ken-burns"
            style={{ objectPosition: 'center 60%' }}
            preload
          />
        </Parallax>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26, 74, 58, 0.78)', zIndex: 1 }} />
        <div className="absolute inset-0 hero-vignette" style={{ zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2 }} className="text-center px-6 py-20">
          <p
            className="animate-hero-line text-xs tracking-[0.35em] uppercase text-white/60 mb-6"
          >
            Official Merchandise
          </p>
          <h1 className="animate-hero-title font-serif text-6xl md:text-8xl font-semibold text-white leading-[1.02] mb-6">
            Wear <em className="italic">the Club</em>
          </h1>
          <div
            className="w-10 h-px bg-white/30 mx-auto mb-6"
            style={{ animation: 'heroFadeIn 0.8s ease 0.45s both' }}
          />
          <p
            className="text-base text-white/80 max-w-xl mx-auto leading-relaxed"
            style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.5s both' }}
          >
            Selected pieces for members and enthusiasts.
          </p>
        </div>
      </section>

      {/* Product grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16 sm:py-20">
        {items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-sm text-gray-400 uppercase tracking-widest">No products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {items.map((product, i) => {
              const variants = [...(product.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
              const firstImg = variants[0]?.images?.[0] ?? null
              return (
                <Reveal key={product.id} direction="up" delay={(i % 3) * 120}>
                  <Link
                    href={`/merch/${product.slug}`}
                    className="group block"
                  >
                    {/* Image */}
                    <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden mb-4 border border-transparent group-hover:border-[#1a4a3a] transition-colors duration-base">
                      {firstImg ? (
                        <Image
                          src={firstImg}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-[1.04] transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-gray-300 text-xs uppercase tracking-widest">No image</span>
                        </div>
                      )}
                      {/* Subtle green veil on hover */}
                      <div className="absolute inset-0 bg-forest/0 group-hover:bg-forest/5 transition-colors duration-base pointer-events-none" />
                    </div>

                    {/* Color swatches */}
                    {variants.length > 0 && (
                      <div className="flex gap-1.5 mb-3">
                        {variants.slice(0, 6).map(v => (
                          <span
                            key={v.id}
                            className="w-4 h-4 border border-gray-200"
                            style={{ backgroundColor: v.color_hex ?? '#ccc' }}
                            title={v.color}
                          />
                        ))}
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-900 group-hover:text-[#1a4a3a] transition-colors">
                        {product.name}
                      </h2>
                      <p className="font-serif text-lg text-gray-900 leading-none">{fmtEur(product.price_cents)}</p>
                    </div>

                    <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1a4a3a] border border-[#1a4a3a] px-3 py-1.5 group-hover:bg-[#1a4a3a] group-hover:text-white transition-colors">
                      View
                      <svg className="w-3 h-3 transition-transform duration-base group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </Link>
                </Reveal>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
