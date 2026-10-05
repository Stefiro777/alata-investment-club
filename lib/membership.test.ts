import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeMembershipExpiry, renewalRuleFromSettings, DEFAULT_RENEWAL_RULE } from './membership.ts'

const iso = (s: string) => computeMembershipExpiry(new Date(s)).toISOString()

// 31/12 23:59:59 in Europe/Rome (CET, UTC+1 in winter) is 22:59:59Z.
test('paid before the 1 October cutoff: expires 31/12 of the same year', () => {
  assert.equal(iso('2026-03-15T10:00:00Z'), '2026-12-31T22:59:59.000Z')
  assert.equal(iso('2026-09-30T21:59:59Z'), '2026-12-31T22:59:59.000Z') // 30/9 23:59:59 Rome
})

test('paid from the 1 October cutoff: expires 31/12 of the next year', () => {
  assert.equal(iso('2026-09-30T22:00:00Z'), '2027-12-31T22:59:59.000Z') // 1/10 00:00 Rome
  assert.equal(iso('2026-10-05T10:00:00Z'), '2027-12-31T22:59:59.000Z')
  assert.equal(iso('2026-12-31T12:00:00Z'), '2027-12-31T22:59:59.000Z')
})

test('the year is read in Rome, not UTC (New Year boundary)', () => {
  // 31/12/2026 23:30 UTC is already 1/1/2027 00:30 in Rome
  assert.equal(iso('2026-12-31T23:30:00Z'), '2027-12-31T22:59:59.000Z')
})

test('a custom cutoff is honoured', () => {
  const rule = { cutoffMonth: 11, cutoffDay: 15 }
  assert.equal(computeMembershipExpiry(new Date('2026-11-14T12:00:00Z'), rule).toISOString(), '2026-12-31T22:59:59.000Z')
  assert.equal(computeMembershipExpiry(new Date('2026-11-15T12:00:00Z'), rule).toISOString(), '2027-12-31T22:59:59.000Z')
})

test('renewalRuleFromSettings falls back to the default on bad input', () => {
  assert.deepEqual(renewalRuleFromSettings(null), DEFAULT_RENEWAL_RULE)
  assert.deepEqual(renewalRuleFromSettings({ renewal_cutoff_month: 13, renewal_cutoff_day: 1 }), DEFAULT_RENEWAL_RULE)
  assert.deepEqual(renewalRuleFromSettings({ renewal_cutoff_month: 9, renewal_cutoff_day: 15 }), { cutoffMonth: 9, cutoffDay: 15 })
})
