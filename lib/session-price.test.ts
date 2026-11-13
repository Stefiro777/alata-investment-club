import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatSessionPrice, parseSessionPrice } from './session-price.ts'

test('the stored cents are shown as euros with a comma', () => {
  assert.equal(formatSessionPrice('3000'), '30,00')
  assert.equal(formatSessionPrice('3050'), '30,50')
  assert.equal(formatSessionPrice(undefined), '30,00')
  assert.equal(formatSessionPrice('abc'), '30,00')
})

test('typed amounts become cents', () => {
  assert.deepEqual(parseSessionPrice('30'), { cents: 3000 })
  assert.deepEqual(parseSessionPrice('30,50'), { cents: 3050 })
  assert.deepEqual(parseSessionPrice('€ 12.5'), { cents: 1250 })
})

test('bad or too high amounts are refused', () => {
  assert.ok('error' in parseSessionPrice('abc'))
  assert.ok('error' in parseSessionPrice('1,234'))
  assert.ok('error' in parseSessionPrice('1000,01'))
  assert.deepEqual(parseSessionPrice('1000'), { cents: 100000 })
})
