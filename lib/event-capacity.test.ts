import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isEventFullError, isSoldOut, seatsByEvent, seatsLeft } from './event-capacity.ts'

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
