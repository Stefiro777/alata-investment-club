// Event capacity helpers. The decisions themselves (is there room?) are taken
// atomically in SQL (register_event_seats / reserve_event_seats, see
// supabase/migrations/20261005_event_capacity_waitlist.sql); this file holds
// the pure bits and the thin server wrappers around those functions.

export type SeatRequest = { eventId: string; seats: number }

/** capacity = null/undefined means unlimited. */
export function isSoldOut(capacity: number | null | undefined, taken: number): boolean {
  return capacity != null && taken >= capacity
}

/**
 * Whether an event should be shown as "Waiting list" (at capacity). Display only:
 * the registration logic stays in SQL. The flag comes from get_event_availability();
 * a missing row, or a capacity that is empty/0 (unlimited), is never full. Past events
 * and coming-soon ones keep their own status. `today` is YYYY-MM-DD.
 */
export function isEventFull(
  event: { date: string; status: string | null },
  availability: { capacity: number | null; sold_out: boolean } | null | undefined,
  today: string,
): boolean {
  if (!availability?.sold_out) return false
  if (!availability.capacity || availability.capacity <= 0) return false
  return event.date >= today && event.status !== 'coming_soon' && event.status !== 'completed'
}

export function seatsLeft(capacity: number | null | undefined, taken: number): number | null {
  return capacity == null ? null : Math.max(0, capacity - taken)
}

/**
 * Seats needed per event by a cart: each ticket line counts `quantity` (default 1);
 * when attendee registrations are attached, they are one seat each. The larger of
 * the two wins, so neither a missing quantity nor a missing registration lets a
 * cart slip under the real number of people.
 */
export function seatsByEvent(
  ticketItems: { referenceId: string; quantity?: number }[],
  registrations?: { eventId: string }[],
): SeatRequest[] {
  const fromTickets = new Map<string, number>()
  for (const t of ticketItems) {
    fromTickets.set(t.referenceId, (fromTickets.get(t.referenceId) ?? 0) + Math.max(1, t.quantity ?? 1))
  }
  const fromRegs = new Map<string, number>()
  for (const r of registrations ?? []) {
    fromRegs.set(r.eventId, (fromRegs.get(r.eventId) ?? 0) + 1)
  }
  const ids = new Set([...fromTickets.keys(), ...fromRegs.keys()])
  return [...ids].map(eventId => ({
    eventId,
    seats: Math.max(fromTickets.get(eventId) ?? 0, fromRegs.get(eventId) ?? 0),
  }))
}

/** True for the 'event_full' exception raised by the SQL functions. */
export function isEventFullError(err: { message?: string } | null | undefined): boolean {
  return !!err?.message && err.message.includes('event_full')
}
