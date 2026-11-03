import { NextRequest, NextResponse } from 'next/server'
import { DASHBOARD_QUOTES, pickQuoteIndex } from '@/lib/dashboard-quotes'

export const dynamic = 'force-dynamic'

const COOKIE = 'alata-dash-quote'

/**
 * GET /api/dashboard-quote: the line shown on the Dashboard. Picked here, on the
 * server, at every request and never equal to the last one, which a session
 * cookie (no expiry) remembers.
 */
export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE)?.value
  const last = raw !== undefined && /^\d{1,3}$/.test(raw) ? Number(raw) : null
  const index = pickQuoteIndex(last)

  const res = NextResponse.json({ quote: DASHBOARD_QUOTES[index] }, { headers: { 'Cache-Control': 'no-store' } })
  res.cookies.set(COOKIE, String(index), { path: '/', sameSite: 'lax', httpOnly: true, secure: process.env.NODE_ENV === 'production' })
  return res
}
