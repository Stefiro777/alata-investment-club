import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Best-effort per-instance rate limit for the public QR check-in flow, where
// the registration id is the only secret: caps brute-force attempts per IP.
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const bucket = rateBuckets.get(ip)
  if (!bucket || now > bucket.resetAt) {
    if (rateBuckets.size > 10_000) rateBuckets.clear()
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }
  bucket.count += 1
  return bucket.count > RATE_LIMIT_MAX
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (rateLimited(ip)) {
    return NextResponse.json({ valid: false, reason: 'rate_limited' }, { status: 429 })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valid: false, reason: 'missing_token' })

  const { data: reg, error } = await supabaseAdmin
    .from('event_registrations')
    .select('id, nome, cognome, event_id, checked_in, checked_in_at')
    .eq('id', token)
    .maybeSingle()

  if (error || !reg) return NextResponse.json({ valid: false, reason: 'not_found' })

  if (reg.checked_in) {
    return NextResponse.json({
      valid: false,
      reason: 'already_checked_in',
      checked_in_at: reg.checked_in_at,
      nome: reg.nome,
      cognome: reg.cognome,
    })
  }

  const now = new Date().toISOString()
  await supabaseAdmin
    .from('event_registrations')
    .update({ checked_in: true, checked_in_at: now, checked_in_by: 'scanner' })
    .eq('id', token)

  const { data: event } = await supabaseAdmin
    .from('upcoming_events')
    .select('title')
    .eq('id', reg.event_id)
    .single()

  return NextResponse.json({
    valid: true,
    nome: reg.nome,
    cognome: reg.cognome,
    event_title: event?.title ?? '',
  })
}

export async function PATCH(req: NextRequest) {
  // Same access as the scanner UI: BoD/Management plus events/media teams.
  if (!(await requireTeamAccess('events', 'media'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { id?: string; checked_in?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, checked_in } = body
  if (!id || checked_in === undefined) {
    return NextResponse.json({ error: 'Missing id or checked_in' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { checked_in }
  if (checked_in) {
    updates.checked_in_at = new Date().toISOString()
    updates.checked_in_by = 'manual'
  } else {
    updates.checked_in_at = null
    updates.checked_in_by = null
  }

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
