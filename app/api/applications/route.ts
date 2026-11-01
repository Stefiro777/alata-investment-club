import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, PHONE_ERROR } from '@/lib/phone'
import { isApplicationCvPath } from '@/lib/cv-path'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const TEAMS = ['lab', 'media', 'events'] as const
const asTeam = (v: unknown) => (TEAMS as readonly string[]).includes(v as string) ? (v as string) : null

/** PostgREST "column not found" (schema cache) or Postgres "undefined column". */
function isMissingColumn(err: { code?: string; message?: string } | null) {
  return !!err && (err.code === 'PGRST204' || err.code === '42703' || /column/i.test(err.message ?? '') && /(find|exist)/i.test(err.message ?? ''))
}

// POST /api/applications — public. Two tracks (Join Us J4 / J6):
//   analyst: operating member, first and second choice among Lab, Media, Events, CV
//   member:  non-operating member, a short request
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const track = body.track === 'member' ? 'member' : 'analyst'
  const nome = str(body.nome, 100)
  const cognome = str(body.cognome, 100)
  const email = str(body.email, 254)
  const degree = str(body.degree_programme, 150)
  const motivazione = str(body.motivazione, 3000)
  const studyLevel = body.study_level === 'master' ? 'master' : body.study_level === 'bachelor' ? 'bachelor' : null
  const firstChoice = asTeam(body.first_choice) ?? asTeam(body.team)
  const secondChoice = asTeam(body.second_choice)
  const linkedin = str(body.linkedin_url, 300)
  const cvPath = isApplicationCvPath(body.cv_path) ? body.cv_path : null
  // Legacy field, still required by older clients; derived for the new form.
  const annoDiStudio = str(body.anno_di_studio, 50)
    || (track === 'member' ? 'Member request' : studyLevel === 'master' ? "Master's" : studyLevel === 'bachelor' ? "Bachelor's" : '')

  if (!nome || !cognome || !degree || !motivazione || !annoDiStudio) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (track === 'analyst' && (!studyLevel || !firstChoice)) {
    return NextResponse.json({ error: 'Choose your degree level and your first choice.' }, { status: 400 })
  }
  if (secondChoice && secondChoice === firstChoice) {
    return NextResponse.json({ error: 'The second choice must be different from the first.' }, { status: 400 })
  }
  if (linkedin && !/^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(linkedin)) {
    return NextResponse.json({ error: 'Please paste the full link to your LinkedIn profile.' }, { status: 400 })
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

  const base = {
    nome,
    cognome,
    email,
    telephone_number: telephone,
    anno_di_studio: annoDiStudio,
    degree_programme: degree,
    team: track === 'member' ? 'member' : firstChoice,
  }

  const { error } = await supabase.from('applications').insert({
    ...base,
    motivazione,
    track,
    study_level: studyLevel,
    first_choice: track === 'analyst' ? firstChoice : null,
    second_choice: track === 'analyst' ? secondChoice : null,
    linkedin_url: linkedin || null,
    cv_path: cvPath,
  })

  // Until the Join Us columns exist (SQL A), keep the extra answers inside the
  // motivation so nothing the applicant wrote is lost.
  if (isMissingColumn(error)) {
    const extras = [
      track === 'member' ? 'Track: Member' : 'Track: Analyst',
      secondChoice ? `Second choice: ${secondChoice}` : null,
      linkedin ? `LinkedIn: ${linkedin}` : null,
      cvPath ? `CV: ${cvPath}` : null,
    ].filter(Boolean).join('\n')
    const { error: legacyError } = await supabase.from('applications').insert({
      ...base,
      motivazione: `${motivazione}\n\n${extras}`.slice(0, 3600),
    })
    if (legacyError) return NextResponse.json({ error: legacyError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
