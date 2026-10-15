// Merch stock helpers shared by the storefront, the cart and /api/checkout.
// Convention: null / undefined = unlimited. A purchase is limited by the
// smallest cap that applies to it: product total, colour, size.

export const LOW_STOCK_THRESHOLD = 5

export type StockVariant = { id: string; color: string; stock?: number | null }
export type StockProduct = {
  stock?: number | null
  size_stock?: Record<string, number> | null
  sizes?: string[] | null
  product_variants?: StockVariant[] | null
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** Units still sellable for a colour/size combination, or null when unlimited. */
export function effectiveStock(product: StockProduct, variantId?: string | null, size?: string | null): number | null {
  const caps: number[] = []
  if (finite(product.stock)) caps.push(product.stock)
  if (variantId) {
    const v = product.product_variants?.find(x => x.id === variantId)
    if (v && finite(v.stock)) caps.push(v.stock)
  }
  if (size && product.size_stock && finite(product.size_stock[size])) caps.push(product.size_stock[size])
  return caps.length ? Math.max(0, Math.min(...caps)) : null
}

/** True when no colour/size combination of the product can be bought any more. */
export function isSoldOut(product: StockProduct): boolean {
  const variants = product.product_variants?.length ? product.product_variants.map(v => v.id) : [null]
  const sizes = product.sizes?.length ? product.sizes : [null]
  for (const v of variants) {
    for (const s of sizes) {
      const left = effectiveStock(product, v, s)
      if (left === null || left > 0) return false
    }
  }
  return true
}

/** "Out of stock" / "Only X left" / null (plenty or unlimited). */
export function stockLabel(left: number | null): string | null {
  if (left === null) return null
  if (left <= 0) return 'Out of stock'
  if (left <= LOW_STOCK_THRESHOLD) return `Only ${left} left`
  return null
}

export type StockRequest = { productId: string; variantColor?: string | null; size?: string | null; quantity: number }
export type StockCheckProduct = StockProduct & { id: string; name: string }

/** Checks a whole cart against the stock; returns a customer-facing error or null. */
export function checkStock(products: StockCheckProduct[], requests: StockRequest[]): string | null {
  const byId = new Map(products.map(p => [p.id, p]))
  const perProduct = new Map<string, number>()
  const perVariant = new Map<string, number>()
  const perSize = new Map<string, number>()

  for (const r of requests) {
    const q = Math.max(1, r.quantity || 1)
    perProduct.set(r.productId, (perProduct.get(r.productId) ?? 0) + q)
    if (r.variantColor) {
      const k = `${r.productId}|${r.variantColor}`
      perVariant.set(k, (perVariant.get(k) ?? 0) + q)
    }
    if (r.size) {
      const k = `${r.productId}|${r.size}`
      perSize.set(k, (perSize.get(k) ?? 0) + q)
    }
  }

  const msg = (name: string, left: number) =>
    left <= 0 ? `Sorry, "${name}" is out of stock.` : `Only ${left} of "${name}" left in stock.`

  for (const [pid, qty] of perProduct) {
    const p = byId.get(pid)
    if (p && finite(p.stock) && qty > p.stock) return msg(p.name, p.stock)
  }
  for (const [key, qty] of perVariant) {
    const [pid, color] = key.split('|')
    const p = byId.get(pid)
    const v = p?.product_variants?.find(x => x.color === color)
    if (p && v && finite(v.stock) && qty > v.stock) return msg(`${p.name} — ${color}`, v.stock)
  }
  for (const [key, qty] of perSize) {
    const [pid, size] = key.split('|')
    const p = byId.get(pid)
    const left = p?.size_stock?.[size]
    if (p && finite(left) && qty > left) return msg(`${p.name} (${size})`, left)
  }
  return null
}

type DecrementItem = { referenceId: string; variantColor?: string | null; size?: string | null; quantity?: number | null }

/**
 * Decrements the stock for a confirmed purchase through the atomic, idempotent
 * SQL function decrement_merch_stock (keyed on the session id, so webhook
 * retries never decrement twice). Never throws: a paid order must not fail on
 * this; problems are logged with a greppable tag.
 */
export async function decrementMerchStock(
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  sessionId: string,
  items: DecrementItem[],
): Promise<void> {
  if (items.length === 0) return
  try {
    const { data, error } = await supabase.rpc('decrement_merch_stock', {
      p_session_id: sessionId,
      p_items: items.map(i => ({
        product_id: i.referenceId,
        variant_color: i.variantColor ?? null,
        size: i.size ?? null,
        quantity: i.quantity ?? 1,
      })),
    })
    if (error) {
      console.error('[stock-error]', JSON.stringify({ sessionId, error: error.message }))
      return
    }
    const shortfalls = (data as { shortfalls?: unknown[] } | null)?.shortfalls
    if (shortfalls?.length) console.error('[stock-shortfall]', JSON.stringify({ sessionId, shortfalls }))
  } catch (e) {
    console.error('[stock-error]', JSON.stringify({ sessionId, error: String(e) }))
  }
}
