import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roleForTeams, roleForInviteTeam, isAnalyst, roleLabel, isRoleCheckViolation } from './roles.ts'

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
