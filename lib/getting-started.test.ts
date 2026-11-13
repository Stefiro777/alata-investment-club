import { test } from 'node:test'
import assert from 'node:assert/strict'
import { audienceTags, gettingStartedLimit, gettingStartedFor, yearsOverLimit } from './getting-started.ts'

const R = (id: string, ...audience: string[]) => ({ id, audience })
const rows = [
  R('guida', 'bachelor'),
  R('start', 'bachelor_1'),
  R('academy', 'bachelor_1'),
  R('cartella', 'bachelor_2', 'bachelor_3'),
  R('gmat', 'bachelor_2', 'bachelor_3'),
  R('cv', 'bachelor_2', 'bachelor_3'),
  R('net', 'master'),
  R('hv', 'master'),
  R('faq', 'master'),
  R('ib', 'master'),
  R('free'),
]
const ids = (l: { id: string }[]) => l.map(r => r.id)

test('tags by level and year', () => {
  assert.deepEqual(audienceTags('bachelor', 2), ['bachelor', 'bachelor_2'])
  assert.deepEqual(audienceTags('bachelor', null), ['bachelor', 'bachelor_1'])
  assert.deepEqual(audienceTags('master', null), ['master'])
  assert.deepEqual(audienceTags(null, null), ['bachelor_1'])
})

test('limit is 3 for the first year of Bachelor and for people with no data, 4 otherwise', () => {
  assert.equal(gettingStartedLimit('bachelor', 1), 3)
  assert.equal(gettingStartedLimit(null, null), 3)
  assert.equal(gettingStartedLimit('bachelor', 3), 4)
  assert.equal(gettingStartedLimit('master', 2), 4)
})

test('each year sees its own list, the level-wide guide first', () => {
  assert.deepEqual(ids(gettingStartedFor(rows, 'bachelor', 1)), ['guida', 'start', 'academy'])
  assert.deepEqual(ids(gettingStartedFor(rows, 'bachelor', 2)), ['guida', 'cartella', 'gmat', 'cv'])
  assert.deepEqual(ids(gettingStartedFor(rows, 'bachelor', 3)), ['guida', 'cartella', 'gmat', 'cv'])
  assert.deepEqual(ids(gettingStartedFor(rows, 'master', 1)), ['net', 'hv', 'faq', 'ib'])
  assert.deepEqual(ids(gettingStartedFor(rows, 'master', null)), ['net', 'hv', 'faq', 'ib'])
  assert.deepEqual(ids(gettingStartedFor(rows, null, null)), ['start', 'academy'])
})

test('years over the limit are reported', () => {
  assert.deepEqual(yearsOverLimit(rows), [])
  const more = [...rows, R('extra', 'bachelor_1'), R('extra2', 'master_2')]
  assert.deepEqual(yearsOverLimit(more), [
    { label: 'Bachelor 1', count: 4, limit: 3 },
    { label: 'Master 2', count: 5, limit: 4 },
  ])
})
