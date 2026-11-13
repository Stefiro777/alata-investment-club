import { test } from 'node:test'
import assert from 'node:assert/strict'
import { suggestLinks } from './team-member-match.ts'

const M = (id: string, full_name: string, removed: string | null = null) => ({ id, full_name, membership_removed_at: removed })
const T = (id: string, name: string, member_id: string | null = null) => ({ id, name, member_id })

test('the same name is an exact match, ignoring case, accents and extra spaces', () => {
  const s = suggestLinks([T('t1', 'Nicolò  Cascione'), T('t2', 'alex bonera')], [M('m1', 'Nicolo Cascione'), M('m2', 'Alex Bonera')])
  assert.deepEqual(s.map(x => [x.teamId, x.kind, x.member.id]), [['t1', 'exact', 'm1'], ['t2', 'exact', 'm2']])
})

test('a name contained in a longer one is only probable: Luca Pialorsi → Luca Paolo Pialorsi', () => {
  const members = [M('a', 'Luca Anghel'), M('p', 'Luca Paolo Pialorsi')]
  const s = suggestLinks([T('t', 'Luca Pialorsi')], members)
  assert.deepEqual(s.map(x => [x.kind, x.member.id]), [['probable', 'p']])
})

test('a first name alone is not enough', () => {
  assert.deepEqual(suggestLinks([T('t', 'Luca Pialorsi')], [M('a', 'Luca Anghel')]), [])
})

test('two members with the same name: nothing is suggested', () => {
  assert.deepEqual(suggestLinks([T('t', 'Marco Rossi')], [M('a', 'Marco Rossi'), M('b', 'Marco Rossi')]), [])
})

test('two possible longer names: nothing is suggested', () => {
  assert.deepEqual(suggestLinks([T('t', 'Luca Pialorsi')], [M('a', 'Luca Paolo Pialorsi'), M('b', 'Luca Maria Pialorsi')]), [])
})

test('members who left, and rows already linked, are left out', () => {
  assert.deepEqual(suggestLinks([T('t', 'Anna Verdi')], [M('a', 'Anna Verdi', '2026-01-01T00:00:00Z')]), [])
  assert.deepEqual(suggestLinks([T('t', 'Anna Verdi', 'zz')], [M('a', 'Anna Verdi')]), [])
})

test('a member already linked to another row is not proposed again', () => {
  assert.deepEqual(suggestLinks([T('t1', 'Anna Verdi', 'a'), T('t2', 'Anna Verdi')], [M('a', 'Anna Verdi')]), [])
})

test('one member suggested for two rows is proposed for neither', () => {
  const s = suggestLinks([T('t1', 'Anna Verdi'), T('t2', 'anna verdi')], [M('a', 'Anna Verdi')])
  assert.deepEqual(s, [])
})

test('a one-word team name only matches the same single word', () => {
  assert.deepEqual(suggestLinks([T('t', 'Madonna')], [M('a', 'Madonna Louise Ciccone')]), [])
  assert.equal(suggestLinks([T('t', 'Madonna')], [M('a', 'Madonna')]).length, 1)
})
