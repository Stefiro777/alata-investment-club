import { romeClock } from './weekly-digest.ts'

/**
 * An event is past when it is completed, or its day (Europe/Rome) is before today.
 * The date decides, not the status alone: some events stay 'open' in the database after the day.
 */
export function isEventPast(date: string | null | undefined, status?: string | null, now: Date = new Date()): boolean {
  if (status === 'completed') return true
  return !!date && date < romeClock(now).date
}

export const EVENT_PAST_ERROR = 'This event has already taken place, registrations are closed.'
export const TICKET_PAST_ERROR = 'This event has already taken place, tickets are no longer available.'
