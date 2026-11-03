import { Resend } from 'resend'
import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { internalEmail, type ApplicationRecord } from '@/lib/application-emails'

function isValidWebhookSecret(provided: string, expected: string): boolean {
  try {
    const a = Buffer.from(provided, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    // timingSafeEqual requires equal-length buffers; pad to avoid length oracle
    if (a.length !== b.length) {
      // Still run a dummy comparison to avoid timing differences on length check alone
      timingSafeEqual(b, b)
      return false
    }
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

const resend = new Resend(process.env.RESEND_API_KEY)

const NOTIFY_TO = 'info@alatainvestmentclub.com'
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

export async function POST(req: NextRequest) {
  // Verify webhook secret using constant-time comparison to prevent timing attacks
  const provided = req.headers.get('x-webhook-secret')
  const expected = process.env.WEBHOOK_SECRET
  if (!provided || !expected || !isValidWebhookSecret(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { record?: ApplicationRecord }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const record = body.record
  if (!record) {
    return NextResponse.json({ error: 'Missing record field' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'
  const { subject, html } = internalEmail(record, siteUrl)
  const replyTo = typeof record.email === 'string' && /^[^s@]+@[^s@]+.[^s@]+$/.test(record.email) ? record.email : undefined

  const { error } = await resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    replyTo,
    subject,
    html,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
