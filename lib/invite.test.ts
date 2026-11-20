import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateInvite } from './invite.ts'

test('a Lab invite needs a valid subdivision', () => {
  assert.deepEqual(validateInvite({ email: 'a@b.it', team: 'lab' }), { error: 'Lab subdivision is required' })
  assert.deepEqual(validateInvite({ email: 'a@b.it', team: 'lab', lab_subdivision: 'x' }), { error: 'Invalid Lab subdivision' })
  assert.deepEqual(validateInvite({ email: ' A@B.it ', team: 'lab', lab_subdivision: 'ma' }), { email: 'a@b.it', team: 'lab', labSubdivision: 'ma' })
})

test('the other teams ignore a subdivision', () => {
  assert.deepEqual(validateInvite({ email: 'a@b.it', team: 'media', lab_subdivision: 'ma' }), { email: 'a@b.it', team: 'media', labSubdivision: null })
})

test('plain member is a valid team, removed and unknown ones are not', () => {
  assert.ok(!('error' in validateInvite({ email: 'a@b.it', team: 'member' })))
  for (const team of ['alumni', 'education', 'syrto', 'career']) {
    assert.deepEqual(validateInvite({ email: 'a@b.it', team }), { error: 'Invalid team' })
  }
})

test('the email is checked', () => {
  assert.deepEqual(validateInvite({ email: 'nope', team: 'media' }), { error: 'Valid email required' })
  assert.deepEqual(validateInvite(null), { error: 'Valid email required' })
})
