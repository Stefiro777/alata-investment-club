import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFlagshipCredits, cleanFlagshipCredits, buildCredits, DEFAULT_FLAGSHIP_CREDITS } from './flagship-credits.ts'

test('missing key falls back to the four defaults', () => assert.deepEqual(parseFlagshipCredits(null), DEFAULT_FLAGSHIP_CREDITS))
test('malformed JSON falls back to the defaults', () => assert.deepEqual(parseFlagshipCredits('{nope'), DEFAULT_FLAGSHIP_CREDITS))
test('non-array JSON falls back to the defaults', () => assert.deepEqual(parseFlagshipCredits('{"a":1}'), DEFAULT_FLAGSHIP_CREDITS))
test('a stored list keeps its order', () => assert.deepEqual(parseFlagshipCredits('["B","A"]'), ['B', 'A']))
test('a stored empty list stays empty', () => assert.deepEqual(parseFlagshipCredits('[]'), []))
test('clean trims, drops empties, non-strings and case-insensitive duplicates', () =>
  assert.deepEqual(cleanFlagshipCredits([' A ', '', 'a', 3, null, 'B']), ['A', 'B']))
test('buildCredits puts flagship names first and skips partners already listed', () =>
  assert.deepEqual(buildCredits(['X', 'Y'], ['y', 'Z']), ['X', 'Y', 'Z']))
