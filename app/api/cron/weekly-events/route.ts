import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase-server'
import { isPubliclyHidden } from '@/lib/public-filters'
import { digestHtml, digestWindow, romeClock, type DigestEvent } from '@/lib/weekly-digest'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'
const KIND = 'weekly_events'

/**
 * GET /api/cron/weekly-events — every Sunday each active member receives the
 * club's events of the next two weeks, with a direct link to register. Vercel
 * Cron (Hobby: one call a day) fires it once, Sundays at 17:00 UTC, which is
 * 18:00 in Rome in winter and 19:00 in summer. A retry on the same day sends
 * nothing more (email_log).
 *
 * Test without writing to anyone else: ?test=<email> sends only to that
 * address, at any time, and is not recorded as the weekly send.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const testTo = req.nextUrl.searchParams.get('test')
  const now = new Date()

  const db = createServiceClient()
  const { date: today } = romeClock(now)

  // Idempotency: one weekly send per Sunday, even if the cron is retried.
  if (!testTo) {
    const { data: sent } = await db.from('email_log').select('id').eq('kind', KIND).gte('created_at', `${today}T00:00:00Z`).limit(1)
    if (sent && sent.length > 0) return NextResponse.json({ skipped: 'already sent today' })
  }

  const { from, to } = digestWindow(today)
  const { data: rows } = await db
    .from('upcoming_events')
    .select('title, slug, date, start_time, location, status, members_only')
    .gte('date', from)
    .lte('date', to)
    .neq('status', 'completed')
    .order('date', { ascending: true })
  const events = ((rows ?? []) as DigestEvent[]).filter(e => !isPubliclyHidden(e.title))
  if (events.length === 0) return NextResponse.json({ skipped: 'no events in the next two weeks' })

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'
  const subject = events.length === 1 ? 'Next two weeks at the club: 1 event' : `Next two weeks at the club: ${events.length} events`

  let recipients: { email: string; full_name: string | null }[]
  if (testTo) {
    recipients = [{ email: testTo, full_name: null }]
  } else {
    const { data: members } = await db
      .from('club_members')
      .select('email, full_name')
      .is('membership_removed_at', null)
      .gt('membership_expires_at', now.toISOString())
    recipients = ((members ?? []) as { email: string | null; full_name: string | null }[])
      .filter((m): m is { email: string; full_name: string | null } => !!m.email)
  }

  // One email per member (no shared recipient list), in batches of 100.
  let ok = 0
  let failed = 0
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100)
    const { error } = await resend.batch.send(chunk.map(r => ({
      from: FROM,
      to: r.email,
      subject,
      html: digestHtml(events, siteUrl, r.full_name?.split(' ')[0]),
    })))
    if (error) { failed += chunk.length; console.error('weekly-events batch failed:', error) }
    else ok += chunk.length
  }

  if (!testTo) {
    await db.from('email_log').insert({ kind: KIND, recipient: `${ok} members`, subject, status: failed ? 'partial' : 'sent', error: failed ? `${failed} failed` : null })
  }
  return NextResponse.json({ sent: ok, failed, events: events.length })
}
