import test from 'node:test'
import assert from 'node:assert/strict'
import Stripe from 'stripe'
import {
  buildMerchOrder, recordMerchOrder, resolveCartItems, splitLineName, summarizeMerchOrders,
  RECONSTRUCTED_NOTE, type MerchLine, type MerchOrderDb, type MerchOrderItem, type SessionLike,
} from './merch-orders.ts'

// ── An in-memory stand-in for record_merch_order (same rules as the SQL function) ──────────
type Row = Record<string, unknown> & { id: string; status: string; fulfillment_status: string; internal_notes: string | null }
function fakeDb() {
  const orders = new Map<string, Row>()
  const items = new Map<string, MerchOrderItem[]>()
  const db = {
    rpc: async (fn: string, args: { p_order: Record<string, unknown>; p_items: MerchOrderItem[] }) => {
      assert.equal(fn, 'record_merch_order')
      const o = args.p_order
      const sid = o.stripe_session_id as string
      const prev = orders.get(sid)
      const row: Row = prev
        ? { ...prev, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined)) }
        : { id: `order-${orders.size + 1}`, status: 'paid', fulfillment_status: 'new', internal_notes: null, ...o }
      orders.set(sid, row)
      items.set(row.id, args.p_items.map(i => ({ ...i })))
      return { data: row.id, error: null }
    },
    from: (table: string) => {
      assert.equal(table, 'merch_orders')
      return {
        select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: [...orders.values()].find(r => r.id === id) ?? null }) }) }),
        update: (patch: Partial<Row>) => ({ eq: async (_c: string, id: string) => {
          const r = [...orders.values()].find(x => x.id === id)
          if (r) Object.assign(r, patch)
          return { error: null }
        } }),
      }
    },
  }
  return { db: db as unknown as MerchOrderDb, orders, items }
}

// ── Stripe events built and signed locally: no payment, no network ─────────────────────────
const SECRET = 'whsec_local_test_secret'
const stripe = new Stripe('sk_test_local_only')
function signedSession(session: SessionLike): SessionLike {
  const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'checkout.session.completed', data: { object: session } })
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
  const event = stripe.webhooks.constructEvent(payload, header, SECRET)
  return event.data.object as unknown as SessionLike
}

const P1 = '11111111-1111-4111-8111-111111111111'
const P2 = '22222222-2222-4222-8222-222222222222'
const P3 = '33333333-3333-4333-8333-333333333333'
const ADDRESS = JSON.stringify({ firstName: 'Test', lastName: 'Buyer', email: 'buyer@example.test', addressLine1: 'Via Prova 1', city: 'Milano', postalCode: '20100', country: 'IT' })
const noLines = async (): Promise<MerchLine[]> => { throw new Error('Stripe must not be called when the metadata is complete') }

function session(over: Partial<SessionLike> & { metadata: Record<string, string> }): SessionLike {
  return {
    id: 'cs_test_1', amount_total: 5000, payment_intent: 'pi_test_1',
    customer_details: { name: 'Test Buyer', email: 'buyer@example.test', phone: null },
    ...over,
  }
}

test('the signature check rejects a different secret', () => {
  const payload = JSON.stringify({ id: 'evt', object: 'event', type: 'x', data: { object: {} } })
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET })
  assert.throws(() => stripe.webhooks.constructEvent(payload, header, 'whsec_other'))
})

test('one item: one order with one line, Stripe not called', async () => {
  const { db, orders, items } = fakeDb()
  const s = signedSession(session({ metadata: {
    type: 'unified', customerName: 'Test Buyer', customerEmail: 'buyer@example.test', shippingAddress: ADDRESS,
    shippingZone: 'IT', shippingCents: '500', discountCode: '', discountCents: '0',
    merchItems: JSON.stringify([{ referenceId: P1, name: 'Felpa', priceCents: 4500, quantity: 1, variantColor: 'Verde', size: 'M' }]),
  } }))
  const order = await buildMerchOrder(s, noLines)
  const id = await recordMerchOrder(db, order)
  assert.equal(orders.size, 1)
  assert.deepEqual(items.get(id), [{ product_id: P1, product_name: 'Felpa', variant_color: 'Verde', size: 'M', quantity: 1, unit_price_cents: 4500 }])
  const row = orders.get('cs_test_1')!
  assert.equal(row.price_cents, 5000)
  assert.equal(row.shipping_zone, 'IT')
  assert.equal(row.shipping_cents, 500)
  assert.equal(row.discount_code, null)
  assert.equal(row.stripe_payment_intent_id, 'pi_test_1')
  assert.equal(row.phone, null)
  assert.equal(order.reconstructed, false)
})

test('several items: every line is saved, with its own size, colour, quantity and unit price', async () => {
  const { db, items } = fakeDb()
  const s = signedSession(session({ amount_total: 11500, metadata: {
    type: 'unified', shippingAddress: ADDRESS,
    merchItems: JSON.stringify([
      { referenceId: P1, name: 'Felpa', priceCents: 4500, quantity: 2, variantColor: 'Verde', size: 'M' },
      { referenceId: P2, name: 'Cappello', priceCents: 2000, quantity: 1, variantColor: null, size: null },
    ]),
  } }))
  const id = await recordMerchOrder(db, await buildMerchOrder(s, noLines))
  assert.equal(items.get(id)!.length, 2)
  assert.equal(items.get(id)![0].quantity, 2)
  assert.equal(items.get(id)![1].product_id, P2)
})

test('discount and shipping zone are kept', async () => {
  const { db, orders } = fakeDb()
  const s = signedSession(session({ amount_total: 4000, metadata: {
    type: 'unified', shippingZone: 'EU', shippingCents: '900', discountCode: 'ALATA10', discountCents: '1000',
    merchItems: JSON.stringify([{ referenceId: P1, name: 'Felpa', priceCents: 4500, quantity: 1, variantColor: 'Verde', size: 'L' }]),
  } }))
  await recordMerchOrder(db, await buildMerchOrder(s, noLines))
  const row = orders.get('cs_test_1')!
  assert.equal(row.discount_code, 'ALATA10')
  assert.equal(row.discount_cents, 1000)
  assert.equal(row.shipping_zone, 'EU')
  assert.equal(row.shipping_cents, 900)
})

test('upsell (legacy merch session): main item plus upsell_items', async () => {
  const { db, orders, items } = fakeDb()
  const s = signedSession(session({ amount_total: 6000, metadata: {
    type: 'merch', mainProductId: P1, mainProductName: 'Felpa', variantColor: 'Verde', size: 'S',
    upsellItems: JSON.stringify([{ type: 'product', referenceId: P2, name: 'Cappello', priceCents: 1500, quantity: 1 }]),
    customerName: 'Test Buyer', customerEmail: 'buyer@example.test', shippingAddress: ADDRESS,
  } }))
  const id = await recordMerchOrder(db, await buildMerchOrder(s, noLines))
  assert.equal(items.get(id)![0].size, 'S')
  assert.equal((orders.get('cs_test_1')!.upsell_items as unknown[]).length, 1)
})

test('truncated metadata: the lines are rebuilt from Stripe and the order says so', async () => {
  const { db, orders, items } = fakeDb()
  const lines: MerchLine[] = [
    { name: 'Felpa — Verde / M', quantity: 2, unit_amount: 4500, product_ref: null },
    { name: 'Cappello — Nero', quantity: 1, unit_amount: 2000, product_ref: P3 },   // product id carried by Stripe
    { name: 'Maglia — Bianco / L', quantity: 1, unit_amount: 3000, product_ref: null },
    { name: 'Biglietto Evento', quantity: 1, unit_amount: 1000, product_ref: null }, // a ticket, not merch
    { name: 'Shipping — IT', quantity: 1, unit_amount: 500, product_ref: null },
  ]
  // What safeJson keeps past 500 characters: no quantity, size or colour.
  const s = signedSession(session({ amount_total: 15500, metadata: {
    type: 'unified', shippingAddress: ADDRESS,
    merchItems: JSON.stringify([
      { type: 'merch', referenceId: P1, name: 'Felpa', priceCents: 4500 },
      { type: 'merch', referenceId: P2, name: 'Cappello', priceCents: 2000 },
      { type: 'merch', referenceId: P3, name: 'Maglia', priceCents: 3000 },
    ]),
    ticketItems: JSON.stringify([{ type: 'ticket', referenceId: 'evt-1', name: 'Biglietto Evento', priceCents: 1000 }]),
  } }))
  const order = await buildMerchOrder(s, async () => lines)
  const id = await recordMerchOrder(db, order)
  const saved = items.get(id)!
  assert.equal(saved.length, 3)
  assert.deepEqual(saved[0], { product_id: P1, product_name: 'Felpa', variant_color: 'Verde', size: 'M', quantity: 2, unit_price_cents: 4500 })
  assert.equal(saved[1].product_id, P3) // the Stripe product id wins over the metadata one
  assert.equal(saved[1].size, null)
  assert.deepEqual([saved[2].product_id, saved[2].size, saved[2].variant_color], [P3, 'L', 'Bianco'])
  assert.equal(order.reconstructed, true)
  assert.equal(orders.get('cs_test_1')!.internal_notes, RECONSTRUCTED_NOTE)
})

test('truncated metadata and Stripe unreachable: the order is still saved, flagged', async () => {
  const { db, items } = fakeDb()
  const s = session({ metadata: { type: 'unified', merchItems: JSON.stringify([{ type: 'merch', referenceId: P1, name: 'Felpa', priceCents: 4500 }]) } })
  const order = await buildMerchOrder(s, async () => { throw new Error('network') })
  const id = await recordMerchOrder(db, order)
  assert.equal(items.get(id)!.length, 1)
  assert.equal(order.reconstructed, true)
})

test('free order: all lines in one order, price 0', async () => {
  const { db, orders, items } = fakeDb()
  const id = await recordMerchOrder(db, {
    stripe_session_id: 'free_abc', customer_name: 'Test Buyer', customer_email: 'buyer@example.test',
    shipping_address: JSON.parse(ADDRESS), phone: null, price_cents: 0, shipping_zone: 'IT', shipping_cents: 0,
    discount_code: 'FREE100', discount_cents: 9000, stripe_payment_intent_id: null, upsell_items: null, reconstructed: false,
    items: [
      { product_id: P1, product_name: 'Felpa', variant_color: 'Verde', size: 'M', quantity: 1, unit_price_cents: 4500 },
      { product_id: P2, product_name: 'Cappello', variant_color: null, size: null, quantity: 2, unit_price_cents: 2250 },
    ],
  })
  assert.equal(orders.size, 1)
  assert.equal(items.get(id)!.length, 2)
  assert.equal(orders.get('free_abc')!.price_cents, 0)
})

test('the same event twice: one order, lines rewritten, refund and shipment survive', async () => {
  const { db, orders, items } = fakeDb()
  const s = signedSession(session({ metadata: {
    type: 'unified',
    merchItems: JSON.stringify([{ referenceId: P1, name: 'Felpa', priceCents: 4500, quantity: 1, variantColor: 'Verde', size: 'M' }]),
  } }))
  const id = await recordMerchOrder(db, await buildMerchOrder(s, noLines))
  const row = orders.get('cs_test_1')!
  Object.assign(row, { status: 'refunded', fulfillment_status: 'shipped', tracking_code: 'TRK1', internal_notes: 'chiamato' })
  const again = await recordMerchOrder(db, await buildMerchOrder(s, noLines))
  assert.equal(again, id)
  assert.equal(orders.size, 1)
  assert.equal(items.get(id)!.length, 1)
  assert.deepEqual([row.status, row.fulfillment_status, row.tracking_code, row.internal_notes], ['refunded', 'shipped', 'TRK1', 'chiamato'])
})

test('the reconstruction note is added once and keeps existing notes', async () => {
  const { db, orders } = fakeDb()
  const s = session({ metadata: { type: 'unified', merchItems: JSON.stringify([{ type: 'merch', referenceId: P1, name: 'Felpa', priceCents: 4500 }]) } })
  const lines = async () => [{ name: 'Felpa — Verde / M', quantity: 1, unit_amount: 4500, product_ref: null }]
  await recordMerchOrder(db, await buildMerchOrder(s, lines))
  orders.get('cs_test_1')!.internal_notes = `ritirato a mano\n${RECONSTRUCTED_NOTE}`
  await recordMerchOrder(db, await buildMerchOrder(s, lines))
  assert.equal(orders.get('cs_test_1')!.internal_notes, `ritirato a mano\n${RECONSTRUCTED_NOTE}`)
})

test('splitLineName', () => {
  assert.deepEqual(splitLineName('Felpa — Verde / M'), { base: 'Felpa', color: 'Verde', size: 'M' })
  assert.deepEqual(splitLineName('Felpa — Verde'), { base: 'Felpa', color: 'Verde', size: null })
  assert.deepEqual(splitLineName('Cappello'), { base: 'Cappello', color: null, size: null })
})

test('a non-uuid product reference never reaches the database', async () => {
  const r = await resolveCartItems('cs', { merchItems: JSON.stringify([{ referenceId: 'not-a-uuid', name: 'X', priceCents: 1, quantity: 1 }]) }, noLines)
  assert.equal(r.items[0].product_id, null)
})

test('summarizeMerchOrders counts units per size and missing addresses', () => {
  const mk = (size: string | null, quantity: number, address: unknown, reconstructed = false) => ({
    shipping_address: address, reconstructed,
    items: [{ product_id: null, product_name: 'Felpa', variant_color: 'Verde', size, quantity, unit_price_cents: 1 }],
  })
  const s = summarizeMerchOrders([mk('M', 2, {}), mk('M', 1, null, true), mk('L', 1, {})])
  assert.deepEqual([s.orders, s.units, s.missingAddress, s.reconstructed], [3, 4, 1, 1])
  assert.deepEqual(s.bySize, { 'Felpa / Verde / M': 3, 'Felpa / Verde / L': 1 })
})
