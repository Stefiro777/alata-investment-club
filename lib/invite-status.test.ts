import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkInviteForAccept, inviteArchiveGroups, inviteStatus, isMissingColumn, isPendingInvite } from './invite-status.ts'

test('pending, accepted or cancelled', () => {
  assert.equal(inviteStatus({ used_at: null, revoked_at: null }), 'pending')
  assert.equal(inviteStatus({}), 'pending')
  assert.equal(inviteStatus({ used_at: '2026-11-01T10:00:00Z' }), 'accepted')
  assert.equal(inviteStatus({ revoked_at: '2026-11-02T10:00:00Z' }), 'cancelled')
  assert.equal(isPendingInvite({ revoked_at: '2026-11-02T10:00:00Z' }), false)
})

test('an accepted invitation stays accepted even with a later cancellation', () => {
  assert.equal(inviteStatus({ used_at: '2026-11-01T10:00:00Z', revoked_at: '2026-11-05T10:00:00Z' }), 'accepted')
})

test('a missing token is 404', () => {
  assert.deepEqual(checkInviteForAccept(null), { ok: false, status: 404, code: 'not_found', error: 'Invite not found' })
})

test('a pending invitation can be accepted', () => {
  assert.deepEqual(checkInviteForAccept({ used_at: null, revoked_at: null }), { ok: true })
})

test('a used invitation is refused with 410 and the code "used"', () => {
  assert.deepEqual(checkInviteForAccept({ used_at: '2026-11-01T10:00:00Z' }), { ok: false, status: 410, code: 'used', error: 'Invite already used' })
})

test('a cancelled invitation is refused with 410, the code "cancelled" and a clear message', () => {
  assert.deepEqual(
    checkInviteForAccept({ used_at: null, revoked_at: '2026-11-02T10:00:00Z' }),
    { ok: false, status: 410, code: 'cancelled', error: 'This invitation was cancelled' },
  )
})

test('the archive groups accepted and cancelled invitations by quarter, newest first, and leaves pending ones out', () => {
  const I = (id: number, over: Record<string, string | null>) => ({ id, created_at: '2026-09-01T10:00:00Z', used_at: null, revoked_at: null, ...over })
  const groups = inviteArchiveGroups([
    I(1, { used_at: '2026-10-12T10:00:00Z' }),
    I(2, { revoked_at: '2026-11-03T10:00:00Z' }),
    I(3, {}),
    I(4, { used_at: '2026-06-20T10:00:00Z' }),
    I(5, { revoked_at: '2027-01-20T10:00:00Z' }),
  ])
  assert.deepEqual(groups.map(g => [g.label, g.invites.map(i => i.id)]), [
    ['Q1 2027', [5]],
    ['Q4 2026', [2, 1]],
    ['Q2 2026', [4]],
  ])
})

test('a missing revoked_at column is recognised', () => {
  assert.equal(isMissingColumn({ code: '42703' }), true)
  assert.equal(isMissingColumn({ message: 'column invites.revoked_at does not exist' }), true)
  assert.equal(isMissingColumn({ code: '23505', message: 'duplicate key' }), false)
  assert.equal(isMissingColumn(null), false)
})
