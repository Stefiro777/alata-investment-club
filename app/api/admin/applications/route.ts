import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { CV_BUCKET, cvStoragePath } from '@/lib/cv-path'

/** Until SQL A, the CV path is written at the end of the motivation ("CV: applications/…"). */
function cvPathOf(row: Record<string, unknown>): string | null {
  if (typeof row.cv_path === 'string') return cvStoragePath(row.cv_path)
  const m = typeof row.motivazione === 'string' ? row.motivazione.match(/\nCV: (applications\/\S+)/) : null
  return m ? cvStoragePath(m[1]) : null
}

// GET /api/admin/applications            → every application, newest first
// GET /api/admin/applications?cv=<id>     → a one-hour signed URL for its CV
export async function GET(req: NextRequest) {
  if (!(await requirePrivilegedAccess())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = createServiceClient()

  const cvId = req.nextUrl.searchParams.get('cv')
  if (cvId) {
    const { data } = await db.from('applications').select('*').eq('id', Number(cvId)).maybeSingle()
    const path = data ? cvPathOf(data as Record<string, unknown>) : null
    if (!path) return NextResponse.json({ error: 'No CV for this application' }, { status: 404 })
    const { data: signed, error } = await db.storage.from(CV_BUCKET).createSignedUrl(path, 3600)
    if (error || !signed) return NextResponse.json({ error: error?.message ?? 'Could not sign the CV link' }, { status: 500 })
    return NextResponse.json({ url: signed.signedUrl })
  }

  const { data, error } = await db.from('applications').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map(r => ({ ...r, has_cv: !!cvPathOf(r as Record<string, unknown>) }))
  return NextResponse.json({ data: rows })
}

// PATCH /api/admin/applications  { id, status: 'seen' | 'accepted' | 'declined' }
export async function PATCH(req: NextRequest) {
  const member = await requirePrivilegedAccess()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json().catch(() => ({})) as { id?: number; status?: string }
  if (!body.id || !['seen', 'accepted', 'declined', 'new'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 })
  }
  const { error } = await createServiceClient()
    .from('applications')
    .update({ status: body.status, reviewed_at: new Date().toISOString(), reviewed_by: member.id })
    .eq('id', body.id)
  if (error && (error.code === 'PGRST204' || error.code === '42703')) {
    return NextResponse.json({ error: 'The status of applications is saved after the Join Us update to the database (SQL A).', code: 'needs_sql' }, { status: 409 })
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
