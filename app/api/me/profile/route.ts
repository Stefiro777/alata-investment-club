import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getSessionMember } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { normalizePhone, PHONE_ERROR } from '@/lib/phone'
import { prepareProfilePhoto } from '@/lib/profile-photo'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const MAX_PHOTO = 4 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function missingColumn(err: { code?: string; message?: string } | null) {
  return !!err && (err.code === 'PGRST204' || err.code === '42703')
}

/**
 * PATCH /api/me/profile — the signed-in member edits their own profile.
 * JSON body with any of: phone, degree_programme, study_level, study_year,
 * linkedin_url. Only the caller's own club_members row is touched.
 */
export async function PATCH(req: NextRequest) {
  const member = await getSessionMember()
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const update: Record<string, unknown> = {}
  if ('phone' in body) {
    const phone = body.phone ? normalizePhone(body.phone) : null
    if (body.phone && !phone) return NextResponse.json({ error: PHONE_ERROR }, { status: 400 })
    update.phone = phone
  }
  if ('degree_programme' in body) update.degree_programme = str(body.degree_programme, 150) || null
  if ('study_level' in body) {
    const lvl = body.study_level
    if (lvl !== null && lvl !== 'bachelor' && lvl !== 'master') return NextResponse.json({ error: 'Invalid level' }, { status: 400 })
    update.study_level = lvl
  }
  if ('study_year' in body) {
    const y = body.study_year === null || body.study_year === '' ? null : Number(body.study_year)
    if (y !== null && (!Number.isInteger(y) || y < 1 || y > 6)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    update.study_year = y
  }
  if ('linkedin_url' in body) {
    const url = str(body.linkedin_url, 300)
    const full = url && !/^https?:\/\//i.test(url) ? `https://${url}` : url
    if (full && !/^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(full)) {
      return NextResponse.json({ error: 'Paste the link to your LinkedIn profile.' }, { status: 400 })
    }
    update.linkedin_url = full || null
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { error } = await createServiceClient().from('club_members').update(update).eq('id', member.id)
  if (missingColumn(error)) {
    return NextResponse.json({ error: 'This field can be edited after the profile update to the database.' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** POST /api/me/profile — multipart "photo": the member's own portrait. */
export async function POST(req: NextRequest) {
  const member = await getSessionMember()
  if (!member) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('photo')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Missing photo' }, { status: 400 })
  if (!PHOTO_TYPES.includes(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 })
  if (file.size > MAX_PHOTO) return NextResponse.json({ error: 'The photo exceeds 4 MB.' }, { status: 400 })

  // Re-encoded before it is stored: at most 800px on the long side, WebP. The same limits on the way in.
  // A file that does not decode is not an image, whatever its content type says.
  let photo
  try {
    photo = await prepareProfilePhoto(Buffer.from(await file.arrayBuffer()))
  } catch {
    return NextResponse.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 })
  }

  const service = createServiceClient()
  const path = `members/${member.id}-${randomUUID()}.${photo.ext}`
  const { error: upErr } = await service.storage.from('team-photos').upload(path, photo.buffer, { contentType: photo.contentType })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  const url = service.storage.from('team-photos').getPublicUrl(path).data.publicUrl

  const { error } = await service.from('club_members').update({ photo_url: url }).eq('id', member.id)
  if (missingColumn(error)) {
    await service.storage.from('team-photos').remove([path])
    return NextResponse.json({ error: 'Photos can be added after the profile update to the database.' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, url })
}
