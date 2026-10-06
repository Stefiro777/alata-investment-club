import { NextRequest, NextResponse } from 'next/server'
import { getCareerActor, canManageMentor } from '@/lib/career-auth'
import { createServiceClient } from '@/lib/supabase-server'
import { signedCvUrl } from '@/lib/job-applications'

/**
 * Redirects to a 60-second signed URL for a booking's CV. Staff for any booking; a
 * mentor only for their own bookings.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCareerActor()
  if (!actor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { data } = await createServiceClient().from('career_bookings').select('cv_url, mentor_id').eq('id', id).maybeSingle()
  if (!data || !canManageMentor(actor, data.mentor_id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const url = await signedCvUrl(data.cv_url, 60)
  if (!url) return NextResponse.json({ error: 'CV not available' }, { status: 404 })
  return NextResponse.redirect(url)
}
