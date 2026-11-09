import test from 'node:test'
import assert from 'node:assert/strict'
import { visiblePartners, publicOnly } from './public-filters.ts'

const rows = [
  { name: 'A', is_hidden: false },
  { name: 'B', is_hidden: true },
  { name: 'C' },
  { name: 'D', is_hidden: null },
]

test('visiblePartners drops only partners flagged hidden', () =>
  assert.deepEqual(visiblePartners(rows).map(r => r.name), ['A', 'C', 'D']))
test('visiblePartners accepts null', () => assert.deepEqual(visiblePartners(null), []))
test('visiblePartners composes with publicOnly', () =>
  assert.deepEqual(publicOnly(visiblePartners([...rows, { name: 'Paintball X', is_hidden: false }]), r => r.name).map(r => r.name), ['A', 'C', 'D']))
