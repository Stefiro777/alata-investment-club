import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { getManageableApplication, signedCvUrl } from '@/lib/job-applications'

/**
 * Redirects to a short-lived signed URL for an application's CV. Only the
 * offer's creator, bod/director and the superadmin can get it.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Creator / bod / director / superadmin, plus the career team, which sees all
  // applications in /admin/jobs.
  let cvUrl: string | null = null
  const app = await getManageableApplication(id)
  if (app) {
    cvUrl = app.cv_url
  } else if (await requireTeamAccess('career')) {
    const { data } = await createServiceClient().from('job_applications').select('cv_url').eq('id', id).maybeSingle()
    cvUrl = data?.cv_url ?? null
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = await signedCvUrl(cvUrl, 60)
  if (!url) return NextResponse.json({ error: 'CV not available' }, { status: 404 })

  return NextResponse.redirect(url)
}
