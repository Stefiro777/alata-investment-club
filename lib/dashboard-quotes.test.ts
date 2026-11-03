import test from 'node:test'
import assert from 'node:assert/strict'
import { DASHBOARD_QUOTES, pickQuoteIndex } from './dashboard-quotes.ts'

test('there are between 12 and 15 phrases, all short and distinct', () => {
  assert.ok(DASHBOARD_QUOTES.length >= 12 && DASHBOARD_QUOTES.length <= 15)
  assert.equal(new Set(DASHBOARD_QUOTES).size, DASHBOARD_QUOTES.length)
  for (const q of DASHBOARD_QUOTES) assert.ok(q.length <= 70)
})

test('never repeats the previous one, whatever the random value', () => {
  const n = DASHBOARD_QUOTES.length
  for (let last = 0; last < n; last++) {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999999]) {
      const i = pickQuoteIndex(last, () => r)
      assert.notEqual(i, last)
      assert.ok(i >= 0 && i < n)
    }
  }
})

test('covers every other phrase', () => {
  const n = DASHBOARD_QUOTES.length
  const seen = new Set<number>()
  for (let k = 0; k < n - 1; k++) seen.add(pickQuoteIndex(3, () => k / (n - 1) + 0.001))
  assert.equal(seen.size, n - 1)
  assert.ok(!seen.has(3))
})

test('a missing or invalid last index still gives a valid one', () => {
  for (const last of [null, -1, 99, 1.5]) {
    const i = pickQuoteIndex(last, () => 0.9999)
    assert.ok(i >= 0 && i < DASHBOARD_QUOTES.length)
  }
})
