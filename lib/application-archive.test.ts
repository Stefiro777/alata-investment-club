import { test } from 'node:test'
import assert from 'node:assert/strict'
import { archiveGroups, isClosed, outcomeDate, quarterOf } from './application-archive.ts'

const A = (id: number, status: string | null, created: string, reviewed?: string | null) => ({ id, status, created_at: created, reviewed_at: reviewed })

test('accepted and declined are closed, new and seen are not', () => {
  assert.equal(isClosed({ status: 'accepted' }), true)
  assert.equal(isClosed({ status: 'declined' }), true)
  assert.equal(isClosed({ status: 'seen' }), false)
  assert.equal(isClosed({ status: 'new' }), false)
  assert.equal(isClosed({ status: null }), false)
})

test('the quarter comes from the outcome date, or from the creation date', () => {
  assert.equal(outcomeDate(A(1, 'accepted', '2026-10-08T10:00:00Z', '2026-11-20T10:00:00Z')), '2026-11-20T10:00:00Z')
  assert.equal(outcomeDate(A(1, 'accepted', '2026-10-08T10:00:00Z', null)), '2026-10-08T10:00:00Z')
  assert.deepEqual(quarterOf('2026-11-20T10:00:00Z'), { key: '2026-Q4', label: 'Q4 2026' })
  assert.deepEqual(quarterOf('2027-02-15T10:00:00Z'), { key: '2027-Q1', label: 'Q1 2027' })
})

test('the archive has one group per quarter, newest first, and leaves open applications out', () => {
  const groups = archiveGroups([
    A(1, 'accepted', '2026-10-08T10:00:00Z', '2026-10-12T10:00:00Z'),
    A(2, 'declined', '2026-10-09T10:00:00Z', '2026-11-03T10:00:00Z'),
    A(3, 'seen', '2026-10-10T10:00:00Z', '2026-10-11T10:00:00Z'),
    A(4, 'accepted', '2026-06-20T10:00:00Z', null),
    A(5, 'declined', '2027-01-20T10:00:00Z', '2027-02-02T10:00:00Z'),
  ])
  assert.deepEqual(groups.map(g => [g.label, g.apps.map(a => a.id)]), [
    ['Q1 2027', [5]],
    ['Q4 2026', [2, 1]],
    ['Q2 2026', [4]],
  ])
})
