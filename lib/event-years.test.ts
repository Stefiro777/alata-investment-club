import { test } from 'node:test'
import assert from 'node:assert/strict'
import { studyYearKey, isYearAllowed, cleanAllowedYears } from './event-years.ts'

test('the year strings found in registrations map to a key', () => {
  assert.equal(studyYearKey('3rd year Bachelor'), 'bachelor_3')
  assert.equal(studyYearKey("Master's 2nd year"), 'master_2')
  assert.equal(studyYearKey('2° anno magistrale'), 'master_2')
  assert.equal(studyYearKey('3° anno triennale'), 'bachelor_3')
  assert.equal(studyYearKey('master 1'), 'master_1')
})

test('ambiguous values do not map', () => {
  for (const v of ['0', '1', '2', "Master's", '', null, undefined]) assert.equal(studyYearKey(v), null)
})

test('an event with no list is open; with a list only those years get in', () => {
  assert.equal(isYearAllowed(null, '0'), true)
  assert.equal(isYearAllowed([], 'x'), true)
  assert.equal(isYearAllowed(['bachelor_2', 'bachelor_3'], '2nd year Bachelor'), true)
  assert.equal(isYearAllowed(['bachelor_2', 'bachelor_3'], '1st year Master'), false)
  assert.equal(isYearAllowed(['bachelor_2'], '2'), false)
})

test('cleanAllowedYears drops unknown values and returns null when empty', () => {
  assert.deepEqual(cleanAllowedYears(['master_1', 'bachelor_1', 'nope']), ['bachelor_1', 'master_1'])
  assert.equal(cleanAllowedYears(['nope']), null)
  assert.equal(cleanAllowedYears('bachelor_1'), null)
})
