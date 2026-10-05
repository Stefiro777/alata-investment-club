import { NextRequest, NextResponse } from 'next/server'
import { getManageableApplication, signedCvUrl } from '@/lib/job-applications'

/**
 * Redirects to a short-lived signed URL for an application's CV. Only the
 * offer's creator, bod/director and the superadmin can get it.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const app = await getManageableApplication(id)
  if (!app) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const url = await signedCvUrl(app.cv_url, 60)
  if (!url) return NextResponse.json({ error: 'CV not available' }, { status: 404 })

  return NextResponse.redirect(url)
}
