// Merch orders: one order = one Stripe Checkout Session (or one free order id),
// with every cart line in merch_order_items. Shared by the Stripe webhook, the
// free-order branch of /api/checkout and scripts/backfill-merch-orders.mjs.
//
// Writing goes through the SQL function record_merch_order(p_order, p_items):
// atomic and idempotent per stripe_session_id. A repeat updates the order and
// rewrites its lines, but never touches status (refunds), fulfilment, tracking
// or notes.
//
// Relative imports only and type-only package imports: node runs this file
// directly (tests, backfill script).

import type { SupabaseClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

export type MerchOrderItem = {
  product_id: string | null
  product_name: string
  variant_color: string | null
  size: string | null
  quantity: number
  unit_price_cents: number
}

export type MerchOrderInput = {
  stripe_session_id: string
  customer_name: string | null
  customer_email: string | null
  shipping_address: unknown
  phone: string | null
  /** What the customer paid in total (session.amount_total). */
  price_cents: number
  shipping_zone: string | null
  shipping_cents: number | null
  discount_code: string | null
  discount_cents: number | null
  stripe_payment_intent_id: string | null
  /** Legacy /api/merch/checkout only: the unified cart has no upsell marker. */
  upsell_items: unknown
  items: MerchOrderItem[]
  /** Some line was rebuilt from Stripe because the metadata was truncated. */
  reconstructed: boolean
}

/** The part of a Checkout Session this module reads (Stripe.Checkout.Session fits). */
export type SessionLike = {
  id: string
  metadata?: Record<string, string> | null
  amount_total?: number | null
  payment_intent?: string | { id: string } | null
  customer_details?: { name?: string | null; email?: string | null; phone?: string | null } | null
}

export type MerchLine = { name: string; quantity: number; unit_amount: number; product_ref: string | null }
export type LineLister = (sessionId: string) => Promise<MerchLine[]>
export type MerchOrderDb = Pick<SupabaseClient, 'rpc' | 'from'>

export const RECONSTRUCTED_NOTE = 'Articoli ricostruiti da Stripe, verificare.'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SEP = ' — '

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const cents = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null)
const metaInt = (v: string | undefined): number | null => {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.round(n) : null
}
const uuidOrNull = (v: unknown): string | null => (typeof v === 'string' && UUID.test(v) ? v : null)

type MetaEntry = Record<string, unknown>

function parseEntries(raw: string | undefined): MetaEntry[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed.filter((x): x is MetaEntry => !!x && typeof x === 'object') : []
  } catch {
    return []
  }
}

/** "Verde / M" -> { color: 'Verde', size: 'M' }; "Verde" -> { color: 'Verde', size: null }. */
export function parseVariantSuffix(suffix: string): { color: string | null; size: string | null } {
  const [color, ...rest] = suffix.split(' / ')
  return { color: str(color), size: str(rest.join(' / ')) }
}

/**
 * The checkout names a coloured merch line "Name — Colour / Size" (or "Name — Colour").
 * A product with a size but no colour is just "Name": its size is not in Stripe's data.
 */
export function splitLineName(name: string): { base: string; color: string | null; size: string | null } {
  const at = name.lastIndexOf(SEP)
  if (at < 0) return { base: name, color: null, size: null }
  return { base: name.slice(0, at), ...parseVariantSuffix(name.slice(at + SEP.length)) }
}

function lineMatches(entry: MetaEntry, line: MerchLine): boolean {
  const name = str(entry.name)
  if (!name || !line.name.startsWith(name)) return false
  const price = cents(entry.priceCents)
  return price == null || price === line.unit_amount
}

/** Cart lines from the session metadata, or rebuilt from Stripe's line items when the metadata was truncated. */
export async function resolveCartItems(
  sessionId: string,
  meta: Record<string, string>,
  listLines: LineLister,
): Promise<{ items: MerchOrderItem[]; reconstructed: boolean }> {
  const entries = parseEntries(meta.merchItems)

  // /api/checkout drops quantity, size and colour from the metadata when it passes 500 characters.
  if (entries.length > 0 && entries.every(e => typeof e.quantity === 'number')) {
    return {
      reconstructed: false,
      items: entries.map(e => ({
        product_id: uuidOrNull(e.referenceId),
        product_name: str(e.name) ?? 'Merch',
        variant_color: str(e.variantColor),
        size: str(e.size),
        quantity: Math.max(1, cents(e.quantity) ?? 1),
        unit_price_cents: Math.max(0, cents(e.priceCents) ?? 0),
      })),
    }
  }

  let lines: MerchLine[] = []
  try { lines = await listLines(sessionId) } catch (e) {
    console.error('listLineItems failed for', sessionId, e instanceof Error ? e.message : e)
  }

  const tickets = parseEntries(meta.ticketItems)
  const pool = entries.map(entry => ({ entry, used: false }))
  const items: MerchOrderItem[] = []

  for (const line of lines) {
    if (line.name.startsWith('Shipping' + SEP)) continue
    const hit = pool.find(p => !p.used && lineMatches(p.entry, line))
    if (hit) {
      hit.used = true
      const name = str(hit.entry.name) as string
      const suffix = line.name.slice(name.length)
      const variant = suffix.startsWith(SEP) ? parseVariantSuffix(suffix.slice(SEP.length)) : { color: null, size: null }
      items.push({
        // A product id carried by the Stripe line wins; then the one the metadata kept.
        product_id: uuidOrNull(line.product_ref) ?? uuidOrNull(hit.entry.referenceId),
        product_name: suffix === '' || suffix.startsWith(SEP) ? name : line.name,
        variant_color: variant.color,
        size: variant.size,
        quantity: Math.max(1, line.quantity),
        unit_price_cents: line.unit_amount,
      })
      continue
    }
    if (tickets.some(t => lineMatches(t, line))) continue // an event ticket, not merch
    const parsed = splitLineName(line.name)
    items.push({
      product_id: uuidOrNull(line.product_ref),
      product_name: parsed.base || 'Merch',
      variant_color: parsed.color,
      size: parsed.size,
      quantity: Math.max(1, line.quantity),
      unit_price_cents: line.unit_amount,
    })
  }

  // Free lines (price 0) are not sent to Stripe: keep what the metadata still knows about them.
  for (const p of pool) {
    if (p.used) continue
    items.push({
      product_id: uuidOrNull(p.entry.referenceId),
      product_name: str(p.entry.name) ?? 'Merch',
      variant_color: null,
      size: null,
      quantity: 1,
      unit_price_cents: Math.max(0, cents(p.entry.priceCents) ?? 0),
    })
  }

  return { items, reconstructed: true }
}

function parseObject(raw: string | undefined): unknown {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}

/** Builds the order from a checkout.session.completed object. Reads Stripe line items only when needed. */
export async function buildMerchOrder(session: SessionLike, listLines: LineLister): Promise<MerchOrderInput> {
  const meta = session.metadata ?? {}
  const total = session.amount_total ?? 0
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null
  const base = {
    stripe_session_id: session.id,
    customer_name: str(meta.customerName) ?? str(session.customer_details?.name),
    customer_email: str(meta.customerEmail) ?? str(session.customer_details?.email),
    shipping_address: parseObject(meta.shippingAddress),
    // Stripe only returns a phone when the session collects one; the checkout does not (yet).
    phone: str(session.customer_details?.phone),
    price_cents: total,
    stripe_payment_intent_id: intent,
  }

  if (meta.type === 'merch') {
    // Legacy /api/merch/checkout: one main item plus the upsell lines in upsellItems.
    return {
      ...base,
      shipping_zone: null,
      shipping_cents: null,
      discount_code: null,
      discount_cents: null,
      upsell_items: parseObject(meta.upsellItems),
      reconstructed: false,
      items: [{
        product_id: uuidOrNull(meta.mainProductId),
        product_name: str(meta.mainProductName) ?? 'Merch',
        variant_color: str(meta.variantColor),
        size: str(meta.size),
        quantity: 1,
        unit_price_cents: total,
      }],
    }
  }

  const { items, reconstructed } = await resolveCartItems(session.id, meta, listLines)
  return {
    ...base,
    shipping_zone: str(meta.shippingZone),
    shipping_cents: metaInt(meta.shippingCents),
    discount_code: str(meta.discountCode),
    discount_cents: metaInt(meta.discountCents),
    upsell_items: null,
    items,
    reconstructed,
  }
}

/** Writes the order and its lines (idempotent per stripe_session_id). Returns the order id. */
export async function recordMerchOrder(db: MerchOrderDb, order: MerchOrderInput): Promise<string> {
  const first = order.items[0]
  const { data, error } = await db.rpc('record_merch_order', {
    p_order: {
      stripe_session_id: order.stripe_session_id,
      product_id: first?.product_id ?? null,
      product_name: first?.product_name ?? 'Merch',
      variant_color: first?.variant_color ?? null,
      size: first?.size ?? null,
      quantity: first?.quantity ?? 1,
      price_cents: order.price_cents,
      upsell_items: order.upsell_items ?? null,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      shipping_address: order.shipping_address ?? null,
      phone: order.phone,
      shipping_zone: order.shipping_zone,
      shipping_cents: order.shipping_cents,
      discount_code: order.discount_code,
      discount_cents: order.discount_cents,
      stripe_payment_intent_id: order.stripe_payment_intent_id,
    },
    p_items: order.items,
  })
  if (error) throw new Error(`record_merch_order failed: ${error.message}`)
  const id = data as string

  if (order.reconstructed) {
    // Best effort and idempotent: the note is added once, existing notes are kept.
    const { data: row } = await db.from('merch_orders').select('internal_notes').eq('id', id).maybeSingle()
    const current = (row as { internal_notes: string | null } | null)?.internal_notes ?? ''
    if (!current.includes(RECONSTRUCTED_NOTE)) {
      const { error: noteError } = await db
        .from('merch_orders')
        .update({ internal_notes: current ? `${current}\n${RECONSTRUCTED_NOTE}` : RECONSTRUCTED_NOTE })
        .eq('id', id)
      if (noteError) console.error('merch order note failed for', order.stripe_session_id, noteError.message)
    }
  }
  return id
}

/** Stripe's line items, read only; the product metadata may carry our product id. */
export function stripeLineLister(stripe: Stripe): LineLister {
  return async sessionId => {
    const out: MerchLine[] = []
    for await (const li of stripe.checkout.sessions.listLineItems(sessionId, { limit: 100, expand: ['data.price.product'] })) {
      const product = li.price?.product
      const ref = product && typeof product === 'object' && 'metadata' in product && product.metadata
        ? product.metadata.product_id ?? product.metadata.referenceId ?? null
        : null
      out.push({
        name: li.description ?? '',
        quantity: li.quantity ?? 1,
        unit_amount: li.price?.unit_amount ?? 0,
        product_ref: ref,
      })
    }
    return out
  }
}

/** Totals for the backfill dry run. */
export function summarizeMerchOrders(orders: Pick<MerchOrderInput, 'items' | 'shipping_address' | 'reconstructed'>[]) {
  const bySize: Record<string, number> = {}
  let units = 0
  let items = 0
  for (const o of orders) {
    for (const it of o.items) {
      items += 1
      units += it.quantity
      const label = [it.product_name, it.variant_color, it.size ?? 'senza taglia'].filter(Boolean).join(' / ')
      bySize[label] = (bySize[label] ?? 0) + it.quantity
    }
  }
  return {
    orders: orders.length,
    items,
    units,
    bySize,
    missingAddress: orders.filter(o => !o.shipping_address).length,
    reconstructed: orders.filter(o => o.reconstructed).length,
  }
}
