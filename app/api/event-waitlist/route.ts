import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/event-waitlist — public sign-up for a sold-out event.
//
// Uses the ANON key on purpose: the insert goes through the RLS policy
// "Public can join waitlist", which only accepts rows for events that are
// actually sold out, as 'waiting', with bounded fields. This route adds the
// friendlier layer on top: validation messages, one entry per email per event
// (unique index), a honeypot and a simple per-IP rate limit.

const RATE_LIMIT_WINDOW_MS = 10 * 60_000
const RATE_LIMIT_MAX = 5
const buckets = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now > b.resetAt) {
    if (buckets.size > 10_000) buckets.clear()
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  b.count += 1
  return b.count > RATE_LIMIT_MAX
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const anon = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Honeypot: real users never see or fill this field. Pretend success.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ success: true })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const eventId = str(body.event_id)
  const nome = str(body.nome)
  const cognome = str(body.cognome)
  const email = str(body.email).toLowerCase()
  const telefono = str(body.telefono)

  if (!UUID_RE.test(eventId)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
  if (!nome || nome.length > 100 || !cognome || cognome.length > 100) {
    return NextResponse.json({ error: 'Please enter your first and last name.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (telefono.length > 40) return NextResponse.json({ error: 'Phone number is too long.' }, { status: 400 })

  const { error } = await anon().from('event_waitlist').insert({
    event_id: eventId,
    nome,
    cognome,
    email,
    telefono: telefono || null,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You are already on the waitlist for this event.', code: 'already_listed' }, { status: 409 })
    }
    // 42501 = RLS check failed: the event is not (or no longer) sold out.
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'This event has seats available again — please register instead.', code: 'not_sold_out' },
        { status: 409 },
      )
    }
    console.error('[event-waitlist] insert failed:', error.code, error.message)
    return NextResponse.json({ error: 'Could not join the waitlist. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
