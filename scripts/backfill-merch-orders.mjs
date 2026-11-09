#!/usr/bin/env node
// Recovers the merch orders the webhook failed to save (merch_orders was empty while
// transactions had the sales: the insert used a column that did not exist).
//
//   node --env-file=.env.local scripts/backfill-merch-orders.mjs                 # dry run
//   node --env-file=.env.local scripts/backfill-merch-orders.mjs --apply         # writes the missing orders
//
// Options:
//   --session cs_...   only this Checkout Session
//   --limit N          at most N sessions
//
// Needs STRIPE_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
//
// What it does, for every transactions row with source_type = 'merch' and a stripe_session_id
// that has no order yet:
//   - reads the Checkout Session and its line items from Stripe (READ ONLY: the only Stripe
//     calls are sessions.retrieve and sessions.listLineItems, a live key is fine);
//   - builds the order with the same code as the webhook (lib/merch-orders.ts): all the lines,
//     shipping zone and cost, discount, payment intent, and the address from the session
//     metadata (Stripe never held a phone or a shipping address for these sessions: left empty);
//   - dry run: prints a summary and writes nothing, not even a log file;
//   - --apply: calls record_merch_order for each (idempotent: running it twice creates no
//     duplicates), sets created_at to the date of the Stripe session, and marks the order
//     'refunded' when a refund transaction already points at the sale.
// Names, emails and addresses are never printed.

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { buildMerchOrder, recordMerchOrder, stripeLineLister, summarizeMerchOrders } from '../lib/merch-orders.ts'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const onlySession = opt('--session')
const limit = opt('--limit') ? Number(opt('--limit')) : Infinity

for (const k of ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[k]) { console.error(`Missing ${k} (run with --env-file=.env.local)`); process.exit(1) }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
// Only these two read calls ever reach Stripe.
const stripeRead = {
  retrieve: id => stripe.checkout.sessions.retrieve(id),
  lines: stripeLineLister(stripe),
}
const tail = id => `…${id.slice(-8)}`

console.log(`${apply ? 'APPLY' : 'DRY RUN'} — Stripe ${process.env.STRIPE_SECRET_KEY.startsWith('sk_live') || process.env.STRIPE_SECRET_KEY.startsWith('rk_live') ? 'LIVE (read only)' : 'test'}\n`)

// 1. The sales that have a transaction ...
const { data: txs, error: txErr } = await supabase
  .from('transactions')
  .select('id, stripe_session_id, date')
  .eq('source_type', 'merch')
  .not('stripe_session_id', 'is', null)
if (txErr) { console.error('transactions:', txErr.message); process.exit(1) }

const bySession = new Map()
for (const t of txs) if (!bySession.has(t.stripe_session_id)) bySession.set(t.stripe_session_id, t)
let sessionIds = [...bySession.keys()].filter(id => !onlySession || id === onlySession)

// 2. ... and no order yet.
const { data: existing, error: exErr } = await supabase.from('merch_orders').select('stripe_session_id').in('stripe_session_id', sessionIds)
if (exErr) { console.error('merch_orders:', exErr.message); process.exit(1) }
const have = new Set((existing ?? []).map(r => r.stripe_session_id))
const alreadyThere = sessionIds.filter(id => have.has(id)).length
sessionIds = sessionIds.filter(id => !have.has(id)).slice(0, limit)

// 3. Refunds already booked against those sales.
const txIds = sessionIds.map(id => bySession.get(id).id)
const { data: refunds } = txIds.length
  ? await supabase.from('transactions').select('refund_of').in('refund_of', txIds)
  : { data: [] }
const refundedTx = new Set((refunds ?? []).map(r => r.refund_of))

// 4. Rebuild every order from Stripe.
const built = []
const problems = []
for (const sessionId of sessionIds) {
  try {
    const session = await stripeRead.retrieve(sessionId)
    if (session.payment_status !== 'paid') { problems.push(`${tail(sessionId)}: payment_status ${session.payment_status}, skipped`); continue }
    const order = await buildMerchOrder(session, stripeRead.lines)
    if (order.items.length === 0) { problems.push(`${tail(sessionId)}: no merch lines found, skipped`); continue }
    built.push({ order, createdAt: new Date(session.created * 1000), refunded: refundedTx.has(bySession.get(sessionId).id) })
  } catch (e) {
    problems.push(`${tail(sessionId)}: ${e instanceof Error ? e.message : e}`)
  }
}

// 5. Summary.
const s = summarizeMerchOrders(built.map(b => b.order))
console.log(`Merch sales in transactions:        ${bySession.size}`)
console.log(`Already in merch_orders:            ${alreadyThere}`)
console.log(`To recover:                         ${sessionIds.length}`)
console.log(`  rebuildable from Stripe:          ${s.orders}  (${s.items} lines, ${s.units} units)`)
console.log(`  of which lines rebuilt by name:   ${s.reconstructed}  (will get the note "verificare" in internal_notes)`)
console.log(`  without a shipping address:       ${s.missingAddress}`)
console.log(`  already refunded:                 ${built.filter(b => b.refunded).length}`)
console.log(`  not recoverable:                  ${problems.length}`)
console.log('\nUnits per product / colour / size:')
for (const [label, n] of Object.entries(s.bySize).sort()) console.log(`  ${String(n).padStart(3)}  ${label}`)
console.log('\nOrders:')
for (const b of built) {
  const o = b.order
  console.log(`  ${tail(o.stripe_session_id)}  ${b.createdAt.toISOString().slice(0, 10)}  ${o.items.length} line(s)  € ${(o.price_cents / 100).toFixed(2)}`
    + `  address: ${o.shipping_address ? 'yes' : 'MISSING'}${o.reconstructed ? '  [rebuilt from Stripe]' : ''}${b.refunded ? '  [refunded]' : ''}`)
}
if (problems.length) { console.log('\nProblems:'); for (const p of problems) console.log('  ' + p) }

if (!apply) {
  console.log('\nDry run: nothing was written. Run again with --apply to create these orders.')
  process.exit(0)
}

// 6. Write.
let written = 0
for (const b of built) {
  try {
    const id = await recordMerchOrder(supabase, b.order)
    const patch = { created_at: b.createdAt.toISOString() }
    if (b.refunded) patch.status = 'refunded'
    const { error } = await supabase.from('merch_orders').update(patch).eq('id', id)
    if (error) throw new Error(`created_at/status: ${error.message}`)
    written++
    console.log(`  ok  ${tail(b.order.stripe_session_id)}`)
  } catch (e) {
    console.error(`  FAILED  ${tail(b.order.stripe_session_id)}: ${e instanceof Error ? e.message : e}`)
  }
}
console.log(`\nCreated ${written} of ${built.length} orders.`)
