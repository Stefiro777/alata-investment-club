import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FINANCE_TABS, isFinanceTab } from './finance-tabs.ts'

test('the four tabs of Finance are recognised, anything else is not', () => {
  for (const key of ['transactions', 'budget', 'documents', 'quotes']) assert.equal(isFinanceTab(key), true)
  for (const v of ['archive', '', 'Documents', undefined, null, 3]) assert.equal(isFinanceTab(v), false)
  assert.deepEqual(FINANCE_TABS.map(t => t.key), ['transactions', 'budget', 'documents', 'quotes'])
})
