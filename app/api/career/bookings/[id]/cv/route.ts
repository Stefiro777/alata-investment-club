import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { signedCvUrl } from '@/lib/job-applications'

/** Redirects to a 60-second signed URL for a booking's CV. Career team, bod/director only. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireTeamAccess('career'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { data } = await createServiceClient().from('career_bookings').select('cv_url').eq('id', id).maybeSingle()
  const url = await signedCvUrl(data?.cv_url, 60)
  if (!url) return NextResponse.json({ error: 'CV not available' }, { status: 404 })
  return NextResponse.redirect(url)
}
