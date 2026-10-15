import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, PHONE_ERROR } from '@/lib/phone'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// POST /api/applications — public. Validates and saves a club application.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const nome = str(body.nome, 100)
  const cognome = str(body.cognome, 100)
  const email = str(body.email, 254)
  const annoDiStudio = str(body.anno_di_studio, 50)
  const degree = str(body.degree_programme, 150)
  const team = str(body.team, 50)
  const motivazione = str(body.motivazione, 3000)

  if (!nome || !cognome || !annoDiStudio || !degree || !motivazione) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }
  const telephone = normalizePhone(body.telephone_number)
  if (!telephone) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 })
  if (motivazione.split(/\s+/).filter(Boolean).length > 200) {
    return NextResponse.json({ error: 'Motivation must not exceed 200 words.' }, { status: 400 })
  }

  // Respect the "applications open" switch server-side too.
  const { data: setting } = await supabase
    .from('settings').select('value').eq('key', 'applications_open').maybeSingle()
  if (setting?.value !== 'true') {
    return NextResponse.json({ error: 'Applications are currently closed.' }, { status: 403 })
  }

  const { error } = await supabase.from('applications').insert({
    nome,
    cognome,
    email,
    telephone_number: telephone,
    anno_di_studio: annoDiStudio,
    degree_programme: degree,
    team: team || null,
    motivazione,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
