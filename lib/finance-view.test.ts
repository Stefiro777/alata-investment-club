import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  totals, refundedIds, canRefund, refundBody, buildTxPayload, txToForm, emptyTxForm, categoriesFor,
  periodLabel, inPeriod, budgetReport, pdfRequest, monthKey, type TxLike,
} from './finance-view.ts'

const NOW = new Date(2026, 10, 15) // 15 November 2026

// ── Add / edit a transaction ─────────────────────────────────────────────────

test('a valid form becomes the payload written on add and on edit', () => {
  const form = { ...emptyTxForm('2026-11-03'), amount: '12.50', description: '  Printing  ', category_id: 'c1', note: ' x ', receipt_url: 'https://r/1' }
  assert.deepEqual(buildTxPayload(form), {
    type: 'revenue', date: '2026-11-03', amount: 12.5, description: 'Printing', category_id: 'c1', note: 'x', receipt_url: 'https://r/1',
  })
})

test('empty optional fields are saved as null', () => {
  const p = buildTxPayload({ ...emptyTxForm('2026-11-03'), amount: '5', description: 'Fee' })
  assert.equal(p?.category_id, null)
  assert.equal(p?.note, null)
  assert.equal(p?.receipt_url, null)
})

test('a missing description or a bad amount is refused', () => {
  assert.equal(buildTxPayload({ ...emptyTxForm('2026-11-03'), amount: '5', description: ' ' }), null)
  assert.equal(buildTxPayload({ ...emptyTxForm('2026-11-03'), amount: '', description: 'x' }), null)
  assert.equal(buildTxPayload({ ...emptyTxForm('2026-11-03'), amount: '0', description: 'x' }), null)
  assert.equal(buildTxPayload({ ...emptyTxForm('2026-11-03'), amount: '-3', description: 'x' }), null)
})

test('a cost marked as refund is saved as rimborso; editing a rimborso reopens as a cost with the flag', () => {
  const p = buildTxPayload({ ...emptyTxForm('2026-11-03'), type: 'cost', isRimborso: true, amount: '9', description: 'Refund' })
  assert.equal(p?.type, 'rimborso')
  const form = txToForm({ type: 'rimborso', date: '2026-11-03', amount: 9, description: 'Refund', category_id: null, note: null, receipt_url: null })
  assert.equal(form.type, 'cost')
  assert.equal(form.isRimborso, true)
  assert.equal(form.amount, '9')
})

test('categories offered follow the type', () => {
  const cats = [{ id: 'a', type: 'revenue' }, { id: 'b', type: 'cost' }, { id: 'c', type: 'both' }, { id: 'd', type: null }]
  assert.deepEqual(categoriesFor(cats, 'revenue').map(c => c.id), ['a', 'c', 'd'])
  assert.deepEqual(categoriesFor(cats, 'cost').map(c => c.id), ['b', 'c', 'd'])
  assert.deepEqual(categoriesFor(cats, 'rimborso').map(c => c.id), ['b', 'c', 'd'])
})

// ── Totals ───────────────────────────────────────────────────────────────────

test('costs and refunds both count as money out', () => {
  const t = totals([
    { type: 'revenue', amount: 100 },
    { type: 'cost', amount: 30 },
    { type: 'rimborso', amount: 20 },
  ])
  assert.deepEqual(t, { revenue: 100, costs: 50, balance: 50 })
  assert.equal(monthKey('2026-11-03'), '2026-11')
})

// ── Refunds ──────────────────────────────────────────────────────────────────

const pay = (over: Partial<TxLike> = {}): TxLike => ({
  id: 'p1', type: 'revenue', date: '2026-11-03', amount: 10, stripe_payment_intent_id: 'pi_1', stripe_refund_id: null, source_type: 'event', ...over,
})

test('event, merch and career payments can be refunded', () => {
  for (const source_type of ['event', 'merch', 'career'] as const) {
    assert.equal(canRefund(pay({ source_type }), new Set()), true)
  }
})

test('membership payments, costs, manual rows and refunded payments cannot', () => {
  assert.equal(canRefund(pay({ source_type: 'membership' }), new Set()), false)
  assert.equal(canRefund(pay({ type: 'cost' }), new Set()), false)
  assert.equal(canRefund(pay({ stripe_payment_intent_id: null }), new Set()), false)
  assert.equal(canRefund(pay({ stripe_refund_id: 're_1' }), new Set()), false)
  assert.equal(canRefund(pay({ source_type: null }), new Set()), false)
})

test('a payment that already has a refund row is marked and not refundable again', () => {
  const rows: TxLike[] = [pay(), { id: 'r1', type: 'rimborso', date: '2026-11-04', amount: 10, refund_of: 'p1' }]
  const ids = refundedIds(rows)
  assert.equal(ids.has('p1'), true)
  assert.equal(canRefund(rows[0], ids), false)
})

test('the refund request carries the transaction id and the confirmation', () => {
  assert.deepEqual(refundBody('p1'), { transactionId: 'p1', confirm: true })
})

// ── Budget report and PDF ────────────────────────────────────────────────────

const txs = [
  { type: 'revenue' as const, date: '2026-11-03', amount: 100, category_id: 'm' },
  { type: 'revenue' as const, date: '2026-11-10', amount: 40, category_id: null },
  { type: 'cost' as const, date: '2026-11-12', amount: 30, category_id: 'e' },
  { type: 'rimborso' as const, date: '2026-11-13', amount: 10, category_id: 'e' },
  { type: 'revenue' as const, date: '2026-09-20', amount: 500, category_id: 'm' },
  { type: 'cost' as const, date: '2025-05-05', amount: 200, category_id: 'e' },
]
const cats = [{ id: 'm', name: 'Membership' }, { id: 'e', name: 'Evento' }, { id: 'u', name: 'Unused' }]

test('period names', () => {
  assert.equal(periodLabel('mensile', 0, NOW), 'Novembre 2026')
  assert.equal(periodLabel('mensile', -1, NOW), 'Ottobre 2026')
  assert.equal(periodLabel('trimestrale', 0, NOW), 'Q4 2026')
  assert.equal(periodLabel('trimestrale', -1, NOW), 'Q3 2026')
  assert.equal(periodLabel('annuale', 0, NOW), '2026')
})

test('a transaction belongs to its month, quarter and year', () => {
  assert.equal(inPeriod('2026-11-10', 'mensile', 0, NOW), true)
  assert.equal(inPeriod('2026-09-20', 'mensile', 0, NOW), false)
  assert.equal(inPeriod('2026-09-20', 'trimestrale', -1, NOW), true)
  assert.equal(inPeriod('2025-05-05', 'annuale', -1, NOW), true)
})

test('the month report: totals, running balance, one row per used category, uncategorised last', () => {
  const r = budgetReport(txs, cats, 'mensile', 0, NOW)
  assert.equal(r.entrate, 140)
  assert.equal(r.uscite, 40)
  assert.equal(r.saldoPeriodo, 100)
  // everything up to the end of November 2026: 100+40+500 in, 30+10+200 out
  assert.equal(r.saldoCumulativo, 400)
  assert.deepEqual(r.catRows, [
    { name: 'Membership', entrate: 100, uscite: 0, saldo: 100 },
    { name: 'Evento', entrate: 0, uscite: 40, saldo: -40 },
    { name: '(Non categorizzato)', entrate: 40, uscite: 0, saldo: 40 },
  ])
})

test('the PDF request keeps the body and the file name the export has always used', () => {
  const r = budgetReport(txs, cats, 'trimestrale', 0, NOW)
  const { body, filename } = pdfRequest('trimestrale', 0, r, NOW)
  assert.equal(body.period, 'Q4 2026')
  assert.deepEqual(Object.keys(body.summary), ['entrate', 'uscite', 'saldo', 'saldoCumulativo'])
  assert.equal(body.summary.saldo, r.saldoPeriodo)
  assert.equal(body.categories, r.catRows)
  assert.equal(filename, 'bilancio-Q4-2026.pdf')
})
