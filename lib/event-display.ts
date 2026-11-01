// Display helpers for events on the redesigned public pages.

/** Kind of event read from its title ("Career Talk w/…" → "Career Talk"). */
export function eventKind(title: string, tag?: string | null): string | null {
  if (tag && tag.trim()) return tag.trim()
  const t = title.toLowerCase()
  if (t.startsWith('career talk')) return 'Career Talk'
  if (t.startsWith('company visit')) return 'Company Visit'
  if (t.startsWith('finance visit')) return 'Finance Visit'
  if (t.startsWith('trading challenge')) return 'Trading Challenge'
  if (t.startsWith('master talk') || t.startsWith('talk') || t.includes(' talk')) return 'Talk'
  if (/aperiti|party|social|street/.test(t)) return 'Social'
  if (t.includes('salone')) return 'Fair'
  if (t.includes('inside the markets')) return 'Visit'
  return null
}

export function dayNumber(iso: string) {
  return String(new Date(iso + 'T00:00:00').getDate()).padStart(2, '0')
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`
}

export function longDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function monthYear(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** Short place for list rows; long addresses are left to the event page. */
export function shortPlace(location: string | null | undefined): string | null {
  if (!location) return null
  const l = location.trim()
  return l.length <= 32 ? l : null
}

export function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',').replace(',00', '')}`
}

/** "Free" · "Free for members · €10 for others" · "€35 members · €70 for others". */
export function priceLine(ticket: number | null | undefined, member: number | null | undefined): string {
  if (ticket === null || ticket === undefined || ticket === 0) return 'Free'
  const m = member ?? ticket
  if (m === 0) return `Free for members · ${fmtEur(ticket)} for others`
  if (m !== ticket) return `${fmtEur(m)} for members · ${fmtEur(ticket)} for others`
  return fmtEur(ticket)
}

export function timeRange(start?: string | null, end?: string | null): string | null {
  const s = start?.slice(0, 5)
  const e = end?.slice(0, 5)
  if (s && e) return `${s} – ${e}`
  return s ?? e ?? null
}

/** YouTube watch / short / youtu.be URL → privacy-enhanced embed URL. */
export function youtubeEmbed(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0` : null
}
