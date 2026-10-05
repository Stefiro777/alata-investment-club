import type { SupabaseClient } from '@supabase/supabase-js'
import { isEventFullError, type SeatRequest } from '@/lib/event-capacity'

export type SeatReservation = { id: string; eventId: string; expiresAt: string }

export type ReserveResult =
  | { ok: true; reservations: SeatReservation[] }
  | { ok: false; reason: 'event_full'; eventId: string }
  | { ok: false; reason: 'error'; message: string }

/**
 * Holds seats for every requested event (service-role client). Each event is
 * decided atomically in SQL; if one of them is full, the seats already held on
 * the others are released again, so a multi-event cart is all-or-nothing.
 */
export async function reserveSeats(
  supabase: SupabaseClient,
  requests: SeatRequest[],
  minutes: number,
): Promise<ReserveResult> {
  const held: SeatReservation[] = []
  for (const req of requests) {
    const { data, error } = await supabase.rpc('reserve_event_seats', {
      p_event_id: req.eventId,
      p_seats: req.seats,
      p_minutes: minutes,
    })
    if (error) {
      await releaseReservations(supabase, held.map(h => h.id))
      if (isEventFullError(error)) return { ok: false, reason: 'event_full', eventId: req.eventId }
      return { ok: false, reason: 'error', message: error.message }
    }
    const row = Array.isArray(data) ? data[0] : data
    held.push({ id: row.reservation_id, eventId: req.eventId, expiresAt: row.expires_at })
  }
  return { ok: true, reservations: held }
}

export async function releaseReservations(supabase: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('event_seat_reservations').delete().in('id', ids)
  if (error) console.error('[event-seats] could not release reservations:', error.message)
}

/** Links held seats to the Checkout Session that will pay for them. */
export async function attachReservationsToSession(
  supabase: SupabaseClient,
  ids: string[],
  sessionId: string,
): Promise<void> {
  if (ids.length === 0) return
  const { error } = await supabase.from('event_seat_reservations').update({ stripe_session_id: sessionId }).in('id', ids)
  if (error) console.error('[event-seats] could not attach reservations to session:', error.message)
}

/** Webhook: the session completed (registrations exist now) or expired. */
export async function releaseSessionReservations(supabase: SupabaseClient, sessionId: string): Promise<void> {
  const { error } = await supabase.from('event_seat_reservations').delete().eq('stripe_session_id', sessionId)
  if (error) console.error('[event-seats] could not release session reservations:', error.message)
}
