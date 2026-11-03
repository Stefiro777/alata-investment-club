import test from 'node:test'
import assert from 'node:assert/strict'
import { isEventPast } from './event-past.ts'

const now = new Date('2026-11-08T23:30:00Z') // already Monday 9 November in Rome

test('a day before today in Rome is past', () => assert.equal(isEventPast('2026-11-08', 'open', now), true))
test('today in Rome is not past', () => assert.equal(isEventPast('2026-11-09', 'open', now), false))
test('a future day is not past', () => assert.equal(isEventPast('2026-11-20', 'open', now), false))
test('completed is past whatever the date', () => assert.equal(isEventPast('2026-12-01', 'completed', now), true))
test('missing date and status is not past', () => assert.equal(isEventPast(null, null, now), false))
