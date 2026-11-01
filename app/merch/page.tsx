import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { isSoldOut, effectiveStock, stockLabel } from '@/lib/merch-stock'
import { publicOnly } from '@/lib/public-filters'
import { fmtEur, longDate } from '@/lib/event-display'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { ScrollProgress } from '@/app/components/site/Media'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Merch — Alata Investment Club',
  description: 'The club’s merch and the tickets for the next paid events.',
}

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Variant = { id: string; color: string; color_hex: string | null; images: string[] | null; sort_order: number; stock: number | null }
type Product = {
  id: string; slug: string; name: string; price_cents: number; description: string | null
  stock: number | null; size_stock: Record<string, number> | null; sizes: string[] | null
  product_variants: Variant[]
}
type Ticket = { id: string; slug: string | null; title: string; date: string; ticket_price_cents: number | null; member_price_cents: number | null }

/** All the photos of a product, first variant first. */
function photosOf(p: Product): string[] {
  return [...(p.product_variants ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap(v => v.images ?? [])
}

/** Board M2: the photo changes on hover (second photo, if there is one). */
function ProductCard({ product }: { product: Product }) {
  const [first, second] = photosOf(product)
  const soldOut = isSoldOut(product)
  const label = soldOut ? 'Out of stock' : stockLabel(effectiveStock({ stock: product.stock }))
  return (
    <Link href={`/merch/${product.slug}`} className="group block">
      <div className="relative aspect-[308/380] overflow-hidden bg-sand">
        {first && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first} alt={product.name} className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${second ? 'group-hover:opacity-0' : ''}`} loading="lazy" />
        )}
        {second && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={second} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" loading="lazy" />
        )}
        {label && (
          <span className="absolute left-3 top-3 rounded-full bg-ivory px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-night">{label}</span>
        )}
      </div>
      <div className="rd-display mt-3.5 text-[24px] leading-[1.15] md:text-[26px]">{product.name}</div>
      <div className="mt-1 text-[14px] text-earth-700">{fmtEur(product.price_cents)}</div>
    </Link>
  )
}

export default async function MerchPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const sp = await searchParams
  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()

  if (!setting || setting.value !== 'true') {
    return (
      <>
        <section className="relative flex min-h-[100svh] flex-col bg-ivory text-night">
          <SiteNav tone="light" />
          <div className="rd-gutter flex flex-1 flex-col justify-center py-28">
            <div className="text-[13px] text-earth-700">Merch</div>
            <h1 className="rd-display mt-3 text-[clamp(52px,7vw,88px)]">Coming <em>soon</em></h1>
            <p className="mt-5 max-w-[420px] text-[15px] leading-[1.7] text-earth-700">The club&apos;s merch is on its way.</p>
          </div>
        </section>
        <SiteFooter />
      </>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const [{ data: products }, { data: tickets }] = await Promise.all([
    supabase
      .from('products')
      .select('id, slug, name, price_cents, description, sizes, stock, size_stock, product_variants (id, color, color_hex, images, sort_order, stock)')
      .eq('visible', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('upcoming_events')
      .select('id, slug, title, date, ticket_price_cents, member_price_cents')
      .eq('status', 'open')
      .gte('date', today)
      .gt('ticket_price_cents', 0)
      .order('date', { ascending: true }),
  ])

  const items = (products ?? []) as Product[]
  const paid = publicOnly(tickets as Ticket[] | null, t => t.title)
  const hero = items[0]
  const heroPhoto = hero ? photosOf(hero)[0] : null

  return (
    <>
      {sp.checkout === 'success' && (
        <div role="status" className="relative z-50 bg-club py-3 text-center text-[14px] text-ivory">
          Order confirmed: a receipt has been sent to your email.
        </div>
      )}

      {/* M1 · one product, large, like a still life */}
      <section className="relative bg-ivory text-night">
        <SiteNav tone="light" />
        {hero ? (
          <div className="rd-gutter grid gap-10 pb-[clamp(56px,8vw,90px)] pt-[clamp(96px,10vw,110px)] md:grid-cols-[minmax(0,440px)_minmax(0,584px)] md:items-center md:justify-between">
            <div className="order-2 md:order-1">
              <div className="text-[13px] text-earth-700">Merch</div>
              <h1 className="rd-display mt-3 text-[clamp(44px,6.3vw,76px)]">{hero.name}</h1>
              <div className="rd-display mt-6 text-[40px]">{fmtEur(hero.price_cents)}</div>
              <Link href={`/merch/${hero.slug}`} className="rd-italic mt-8 inline-block text-[clamp(36px,3.7vw,44px)] text-club hover:underline underline-offset-[0.18em]">
                Choose your size
              </Link>
            </div>
            <Link href={`/merch/${hero.slug}`} className="order-1 block aspect-square overflow-hidden bg-sand md:order-2" aria-label={hero.name}>
              {heroPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={heroPhoto} alt="" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]" />
              )}
            </Link>
          </div>
        ) : (
          <div className="rd-gutter pb-24 pt-[clamp(110px,14vw,140px)]">
            <h1 className="rd-display text-[clamp(52px,7vw,88px)]">The <em>shop</em></h1>
            <p className="mt-5 text-[15px] text-earth-700">New pieces are on their way.</p>
          </div>
        )}
      </section>

      {/* M2 · products and tickets */}
      {(items.length > 0 || paid.length > 0) && (
        <section className="border-t border-night/10 bg-ivory py-[clamp(56px,8vw,90px)] text-night">
          <div className="rd-gutter grid gap-16 lg:grid-cols-[minmax(0,640px)_minmax(0,384px)] lg:justify-between">
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6">
              {items.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
            <div>
              <h2 className="rd-display text-[48px] italic">Tickets</h2>
              {paid.length === 0 ? (
                <p className="mt-5 border-t border-night pt-4 text-[14px] text-earth-700">No paid events open right now.</p>
              ) : (
                <ul className="mt-5 border-t border-night">
                  {paid.map(t => (
                    <li key={t.id}>
                      <Link href={t.slug ? `/events/${t.slug}#register` : '/events'} className="block border-b border-night/20 py-4 transition-colors hover:bg-night/[0.03]">
                        <div className="rd-display text-[24px]">{t.title}</div>
                        <div className="mt-1 text-[13px] text-earth-700">
                          {longDate(t.date)} · {fmtEur(t.ticket_price_cents ?? 0)}
                          {t.member_price_cents != null && t.member_price_cents !== t.ticket_price_cents ? ` · members ${t.member_price_cents ? fmtEur(t.member_price_cents) : 'free'}` : ''}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
