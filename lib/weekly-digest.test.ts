import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isDigestTime, digestWindow, romeClock, digestHtml } from './weekly-digest.ts'

test('18:00 in Rome on a winter Sunday is 17:00 UTC', () => {
  assert.equal(isDigestTime(new Date('2026-11-08T17:00:00Z')), true)
  assert.equal(isDigestTime(new Date('2026-11-08T16:00:00Z')), false)
})

test('18:00 in Rome on a summer Sunday is 16:00 UTC', () => {
  assert.equal(isDigestTime(new Date('2027-06-06T16:00:00Z')), true)
  assert.equal(isDigestTime(new Date('2027-06-06T17:00:00Z')), false)
})

test('not on other days', () => {
  assert.equal(isDigestTime(new Date('2026-11-09T17:00:00Z')), false)
})

test('the window covers the next fourteen days', () => {
  assert.deepEqual(digestWindow('2026-11-08'), { from: '2026-11-09', to: '2026-11-22' })
  assert.equal(romeClock(new Date('2026-11-08T23:30:00Z')).date, '2026-11-09')
})

test('the email links each event to its registration and escapes text', () => {
  const html = digestHtml([{ title: 'Talk <b>', slug: 'talk', date: '2026-11-11', start_time: '18:00:00', location: null, status: 'open', members_only: true }], 'https://x.test')
  assert.match(html, /https:\/\/x\.test\/events\/talk#register/)
  assert.match(html, /Talk &lt;b&gt;/)
  assert.match(html, /Members only/)
})
