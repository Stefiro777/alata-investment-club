// Sunday digest: the club's events of the next two weeks, sent to every
// active member at 18:00 Europe/Rome. Pure helpers, covered by tests.

export type DigestEvent = {
  title: string
  slug: string | null
  date: string // YYYY-MM-DD
  start_time: string | null
  location: string | null
  status: string | null
  members_only: boolean | null
}

/** Weekday and hour in Rome, whatever the server time zone (Vercel runs in UTC). */
export function romeClock(now: Date): { weekday: string; hour: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', weekday: 'short', hour: '2-digit', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return { weekday: get('weekday'), hour: Number(get('hour')), date: `${get('year')}-${get('month')}-${get('day')}` }
}

/** The cron fires at 16:00 and 17:00 UTC on Sundays; only the run that is 18:00 in Rome sends. */
export function isDigestTime(now: Date): boolean {
  const { weekday, hour } = romeClock(now)
  return weekday === 'Sun' && hour === 18
}

/** Days after `fromDate` (exclusive) up to 14 days later (inclusive). */
export function digestWindow(fromDate: string): { from: string; to: string } {
  const d = new Date(fromDate + 'T00:00:00Z')
  const add = (n: number) => new Date(d.getTime() + n * 86_400_000).toISOString().slice(0, 10)
  return { from: add(1), to: add(14) }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function digestHtml(events: DigestEvent[], siteUrl: string, firstName?: string | null): string {
  const rows = events.map(e => {
    const d = new Date(e.date + 'T00:00:00Z')
    const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    const meta = [day, e.start_time?.slice(0, 5), e.location].filter(Boolean).map(x => esc(String(x))).join(' · ')
    const link = e.slug ? `${siteUrl}/events/${encodeURIComponent(e.slug)}#register` : `${siteUrl}/events`
    const cta = e.status === 'open' ? 'Register' : 'See the event'
    return `
      <tr><td style="padding:18px 0;border-bottom:1px solid #d9d3c5;">
        <div style="font-family:Georgia,serif;font-size:22px;line-height:1.2;color:#0b1d16;">${esc(e.title)}</div>
        <div style="margin-top:6px;font-size:13px;color:#4a4740;">${meta}${e.members_only ? ' · Members only' : ''}</div>
        <a href="${link}" style="display:inline-block;margin-top:10px;font-family:Georgia,serif;font-style:italic;font-size:18px;color:#1a4a3a;">${cta} &rarr;</a>
      </td></tr>`
  }).join('')
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f1e8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;"><tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#5a5750;">Alata Investment Club</td></tr>
      <tr><td style="padding-top:12px;font-family:Georgia,serif;font-size:34px;line-height:1.15;color:#0b1d16;">${firstName ? `${esc(firstName)}, the` : 'The'} next two weeks</td></tr>
      <tr><td style="padding:10px 0 8px;font-size:14px;line-height:1.6;color:#3d3b37;">What the club has planned. One click to register.</td></tr>
      <tr><td style="border-top:1px solid #0b1d16;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="padding-top:22px;font-size:12px;line-height:1.6;color:#5a5750;">
        You receive this email every Sunday as a member of the club. All events: <a href="${siteUrl}/events" style="color:#1a4a3a;">${siteUrl.replace(/^https?:\/\//, '')}/events</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}
