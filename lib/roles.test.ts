import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roleForTeams, roleForInviteTeam, isAnalyst, roleLabel, isRoleCheckViolation, checkRoleChange, roleWarnings, isPrivilegedRole, SUPERADMIN_EMAIL } from './roles.ts'

test('the role is the main team, in priority order', () => {
  assert.equal(roleForTeams(['events', 'lab']), 'lab')
  assert.equal(roleForTeams(['alumni', 'career']), 'career')
  assert.equal(roleForTeams(['education', 'syrto']), 'member')
  assert.equal(roleForTeams(null), 'member')
})

test('an invite to a team gives that role; "member" and unknown give member', () => {
  assert.equal(roleForInviteTeam('media'), 'media')
  assert.equal(roleForInviteTeam('alumni'), 'alumni')
  assert.equal(roleForInviteTeam('member'), 'member')
  assert.equal(roleForInviteTeam('nope'), 'member')
})

test('analysts are lab, media and events, also while the roles are not migrated', () => {
  assert.equal(isAnalyst('lab'), true)
  assert.equal(isAnalyst('member', ['events']), true)
  assert.equal(isAnalyst('member', ['career']), false)
  assert.equal(isAnalyst('member'), false)
  assert.equal(isAnalyst('bod', ['lab']), false)
})

test('director reads as Management', () => {
  assert.equal(roleLabel('director'), 'Management')
  assert.equal(roleLabel('management'), 'Management')
  assert.equal(roleLabel('bod'), 'BoD')
  assert.equal(roleLabel(null), '—')
})

test('a role-check violation is told apart from other errors', () => {
  assert.equal(isRoleCheckViolation({ code: '23514' }), true)
  assert.equal(isRoleCheckViolation({ message: 'violates check constraint "club_members_role_check"' }), true)
  assert.equal(isRoleCheckViolation({ code: '23505' }), false)
  assert.equal(isRoleCheckViolation(null), false)
})

const base = { requesterId: 'a', requesterRole: 'bod', targetId: 'b', targetEmail: 'x@y.it' }

test('only BoD and Management change roles', () => {
  assert.deepEqual(checkRoleChange({ ...base, requesterRole: 'member', newRole: 'lab' }), { ok: false, status: 403, error: 'Only the BoD and Management can change roles.' })
  assert.equal(checkRoleChange({ ...base, requesterRole: 'director', newRole: 'lab' }).ok, true)
  assert.equal(checkRoleChange({ ...base, newRole: 'media' }).ok, true)
})

test('an unknown role is refused', () => {
  const r = checkRoleChange({ ...base, newRole: 'admin' })
  assert.equal(r.ok, false)
  assert.equal(!r.ok && r.status, 400)
})

test('the superadmin and the requester keep their privileged role', () => {
  assert.equal(checkRoleChange({ ...base, targetEmail: SUPERADMIN_EMAIL.toUpperCase(), newRole: 'member' }).ok, false)
  assert.equal(checkRoleChange({ ...base, targetEmail: SUPERADMIN_EMAIL, newRole: 'director' }).ok, true)
  assert.equal(checkRoleChange({ ...base, targetId: 'a', newRole: 'lab' }).ok, false)
  assert.equal(checkRoleChange({ ...base, targetId: 'a', newRole: 'bod' }).ok, true)
})

test('warnings for a role the data does not support', () => {
  assert.deepEqual(roleWarnings('member', [], null), [])
  assert.equal(roleWarnings('media', ['events'], null).length, 1)
  assert.equal(roleWarnings('media', ['media'], null).length, 0)
  assert.equal(roleWarnings('lab', ['lab'], null).length, 1)
  assert.equal(roleWarnings('lab', ['lab'], 'ma').length, 0)
  assert.equal(roleWarnings('lab', null, null).length, 2)
  assert.equal(isPrivilegedRole('director'), true)
  assert.equal(isPrivilegedRole('lab'), false)
})
