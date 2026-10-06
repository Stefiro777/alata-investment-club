import type { SupabaseClient } from '@supabase/supabase-js'
import { CAREER_SESSION_MINUTES } from '@/lib/career-session'

export type MentorSlot = { date: string; time: string; available: boolean }

const pad = (n: number) => String(n).padStart(2, '0')

/** Slot dates/times are stored as naive local (Rome) values, so "now" must be Rome time too. */
export function romeNow(): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date())
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? '00'
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function fromMinutes(mins: number): string {
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`
}

/** Splits an availability window into back-to-back 30-minute session starts. */
function subdivide(startTime: string, endTime: string | null): string[] {
  const start = toMinutes(startTime)
  const end = endTime ? toMinutes(endTime) : start + CAREER_SESSION_MINUTES
  const times: string[] = []
  for (let t = start; t + CAREER_SESSION_MINUTES <= end; t += CAREER_SESSION_MINUTES) times.push(fromMinutes(t))
  return times
}

function occurrencesOfWeekday(year: number, month: number, dow: number): string[] {
  const dates: string[] = []
  const total = new Date(year, month, 0).getDate()
  for (let d = 1; d <= total; d++) {
    if (new Date(year, month - 1, d).getDay() === dow) dates.push(`${year}-${pad(month)}-${pad(d)}`)
  }
  return dates
}

/**
 * Bookable 30-minute slots of one mentor for a month, built from the mentor's own
 * availability rows. A slot is `available` when it is in the future (Rome time) and
 * the mentor has no live booking on it (capacity is 1 per mentor slot).
 */
export async function getMentorSlots(
  supabase: SupabaseClient,
  mentorId: string,
  year: number,
  month: number,
): Promise<MentorSlot[]> {
  const monthStart = `${year}-${pad(month)}-01`
  const monthEnd = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`

  const [{ data: availability, error: availErr }, { data: bookings, error: bookErr }] = await Promise.all([
    supabase.from('career_availability').select('*').eq('mentor_id', mentorId).eq('active', true),
    supabase
      .from('career_bookings')
      .select('slot_date, slot_time')
      .eq('mentor_id', mentorId)
      .gte('slot_date', monthStart)
      .lt('slot_date', monthEnd)
      .neq('status', 'cancelled'),
  ])
  if (availErr) throw new Error(availErr.message)
  if (bookErr) throw new Error(bookErr.message)

  const slots = new Map<string, { date: string; time: string }>()
  const add = (date: string, time: string) => slots.set(`${date}|${time}`, { date, time })

  for (const row of availability ?? []) {
    if (!row.start_time) continue
    const times = subdivide(row.start_time, row.end_time)
    if (row.type === 'recurring' && row.day_of_week != null) {
      for (const date of occurrencesOfWeekday(year, month, row.day_of_week)) for (const t of times) add(date, t)
    } else if (row.type === 'one_time' && row.date && row.date >= monthStart && row.date < monthEnd) {
      for (const t of times) add(row.date, t)
    }
  }

  const booked = new Set((bookings ?? []).map(b => `${b.slot_date}|${String(b.slot_time).slice(0, 5)}`))
  const now = romeNow()

  return [...slots.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map(s => ({
      ...s,
      available: !booked.has(`${s.date}|${s.time}`) && (s.date > now.date || (s.date === now.date && s.time > now.time)),
    }))
}

/** The slot is one the mentor really offers, still free and in the future. */
export async function isSlotBookable(
  supabase: SupabaseClient,
  mentorId: string,
  date: string,
  time: string,
): Promise<boolean> {
  const [y, m] = date.split('-').map(Number)
  if (!y || !m) return false
  const slots = await getMentorSlots(supabase, mentorId, y, m)
  return slots.some(s => s.date === date && s.time === time.slice(0, 5) && s.available)
}
