export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** Returns Mon=0 … Sun=6 offset for the first day of the given month. */
export function firstDayOffset(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1
}

export function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}
