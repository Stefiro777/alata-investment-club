import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isEventFull, isEventFullError, isSoldOut, seatsByEvent, seatsLeft } from './event-capacity.ts'

test('unlimited events are never sold out', () => {
  assert.equal(isSoldOut(null, 10_000), false)
  assert.equal(isSoldOut(undefined, 0), false)
  assert.equal(seatsLeft(null, 5), null)
})

test('sold out exactly at capacity, not before', () => {
  assert.equal(isSoldOut(50, 49), false)
  assert.equal(isSoldOut(50, 50), true)
  assert.equal(isSoldOut(50, 51), true) // admin overbooking still reads as full
  assert.equal(seatsLeft(50, 49), 1)
  assert.equal(seatsLeft(50, 60), 0)
})

// Availability row as get_event_availability() builds it: sold_out = capacity set and taken >= capacity.
const TODAY = '2026-11-22'
const upcoming = { date: '2026-12-01', status: 'open' }
const avail = (capacity: number | null, taken: number) => ({
  capacity,
  sold_out: capacity != null && taken >= capacity,
})

test('isEventFull: null capacity (unlimited) is never full', () => {
  assert.equal(isEventFull(upcoming, avail(null, 10_000), TODAY), false)
  assert.equal(isEventFull(upcoming, undefined, TODAY), false)
  assert.equal(isEventFull(upcoming, null, TODAY), false)
})

test('isEventFull: capacity 0 means unlimited, so not full', () => {
  assert.equal(isEventFull(upcoming, avail(0, 0), TODAY), false)
  assert.equal(isEventFull(upcoming, avail(0, 5), TODAY), false)
})

test('isEventFull: below, at and above capacity', () => {
  assert.equal(isEventFull(upcoming, avail(50, 49), TODAY), false)
  assert.equal(isEventFull(upcoming, avail(50, 50), TODAY), true)
  assert.equal(isEventFull(upcoming, avail(50, 51), TODAY), true)
})

test('isEventFull: past, coming-soon and completed events keep their own status', () => {
  const full = avail(10, 10)
  assert.equal(isEventFull({ date: '2026-11-01', status: 'open' }, full, TODAY), false)
  assert.equal(isEventFull({ date: '2026-12-01', status: 'coming_soon' }, full, TODAY), false)
  assert.equal(isEventFull({ date: '2026-12-01', status: 'completed' }, full, TODAY), false)
  assert.equal(isEventFull({ date: TODAY, status: 'open' }, full, TODAY), true) // today still counts
})

test('seatsByEvent: quantity defaults to 1 and sums per event', () => {
  assert.deepEqual(
    seatsByEvent([{ referenceId: 'a' }, { referenceId: 'a', quantity: 2 }, { referenceId: 'b' }]),
    [{ eventId: 'a', seats: 3 }, { eventId: 'b', seats: 1 }],
  )
})

test('seatsByEvent: registrations raise the count when they exceed the tickets', () => {
  assert.deepEqual(
    seatsByEvent([{ referenceId: 'a' }], [{ eventId: 'a' }, { eventId: 'a' }, { eventId: 'c' }]),
    [{ eventId: 'a', seats: 2 }, { eventId: 'c', seats: 1 }],
  )
})

test('seatsByEvent: a zero or negative quantity still needs one seat', () => {
  assert.deepEqual(seatsByEvent([{ referenceId: 'a', quantity: 0 }]), [{ eventId: 'a', seats: 1 }])
})

test('isEventFullError recognises the SQL exception', () => {
  assert.equal(isEventFullError({ message: 'event_full' }), true)
  assert.equal(isEventFullError({ message: 'other' }), false)
  assert.equal(isEventFullError(null), false)
})
