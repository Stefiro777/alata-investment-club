/**
 * Events reserved to some years of study (upcoming_events.allowed_years).
 * Empty or null = open to everyone. The year comes from the registration form
 * (event_registrations.anno_di_studio), so it works with and without an account.
 */

export const EVENT_YEARS = [
  { value: 'bachelor_1', label: 'Bachelor 1', form: '1st year Bachelor' },
  { value: 'bachelor_2', label: 'Bachelor 2', form: '2nd year Bachelor' },
  { value: 'bachelor_3', label: 'Bachelor 3', form: '3rd year Bachelor' },
  { value: 'master_1', label: 'Master 1', form: '1st year Master' },
  { value: 'master_2', label: 'Master 2', form: '2nd year Master' },
] as const

export type EventYear = (typeof EVENT_YEARS)[number]['value']

const VALID = new Set<string>(EVENT_YEARS.map(y => y.value))

/** Keeps only known year values; returns null when nothing is left (= open to all). */
export function cleanAllowedYears(input: unknown): EventYear[] | null {
  if (!Array.isArray(input)) return null
  const years = EVENT_YEARS.map(y => y.value).filter(v => input.includes(v))
  return years.length > 0 ? years : null
}

/**
 * "3rd year Bachelor", "Master's 2nd year", "2° anno magistrale", "master 1"
 * → "bachelor_3", "master_2", "master_2", "master_1". Anything that does not
 * say both level and year ("2", "0", "Master's") → null.
 */
export function studyYearKey(text: string | null | undefined): string | null {
  const t = (text ?? '').toLowerCase()
  const level = /master|magistral|msc/.test(t) ? 'master' : /bachelor|triennal|bsc|laurea/.test(t) ? 'bachelor' : null
  if (!level) return null
  const m = t.match(/([1-6])\s*(?:st|nd|rd|th|°|º|\^)?\s*(?:year|anno)/) ?? t.match(/\b([1-6])\b/)
  return m ? `${level}_${m[1]}` : null
}

/** True when the event is open to everyone, or the year the person declared is on its list. */
export function isYearAllowed(allowed: readonly string[] | null | undefined, anno: string | null | undefined): boolean {
  if (!allowed || allowed.length === 0) return true
  const key = studyYearKey(anno)
  return key !== null && allowed.includes(key)
}

export function yearsLabel(allowed: readonly string[] | null | undefined): string {
  return EVENT_YEARS.filter(y => allowed?.includes(y.value)).map(y => y.label).join(', ')
}

export function yearRestrictedError(allowed: readonly string[] | null | undefined): string {
  return `This event is reserved to students of: ${yearsLabel(allowed)}. Check the year of study you entered.`
}

/** "Bachelor 2" / "Master 1" from the profile's level and year; null when either is missing. */
export function formatStudyYear(level: string | null | undefined, year: number | null | undefined): string | null {
  if ((level !== 'bachelor' && level !== 'master') || !year) return null
  return `${level === 'bachelor' ? 'Bachelor' : 'Master'} ${year}`
}

/** The filter key of a profile ("bachelor_2"), or null with no study data. */
export function studyKeyOf(level: string | null | undefined, year: number | null | undefined): string | null {
  return (level === 'bachelor' || level === 'master') && year ? `${level}_${year}` : null
}
