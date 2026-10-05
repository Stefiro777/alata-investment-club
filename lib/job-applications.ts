import { createClient, createServiceClient } from '@/lib/supabase-server'
import { PRIVILEGED_ROLES } from '@/lib/auth'

export const SUPERADMIN_EMAIL = 'finullistefano@gmail.com'
export const FALLBACK_APPLICATION_EMAIL = 'info@alatainvestmentclub.com'
const CV_BUCKET = 'cv-uploads'

export type JobApplicationRow = {
  id: string
  job_offer_id: string
  job_title: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  linkedin_url: string | null
  cover_letter: string | null
  cv_url: string | null
  cv_filename: string | null
  submitted_at: string
  notified_at: string | null
}

/**
 * Mirrors the RLS function public.can_manage_job_application: the offer's
 * creator, bod/director and the superadmin. Returns the application when the
 * current session user may manage it, null otherwise (also when unauthenticated).
 */
export async function getManageableApplication(applicationId: string): Promise<JobApplicationRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()
  const { data: app } = await service
    .from('job_applications')
    .select('id, job_offer_id, job_title, first_name, last_name, email, phone, linkedin_url, cover_letter, cv_url, cv_filename, submitted_at, notified_at')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app) return null

  if (user.email === SUPERADMIN_EMAIL) return app as JobApplicationRow

  const { data: member } = await service
    .from('club_members')
    .select('role')
    .eq('email', user.email ?? '')
    .maybeSingle()
  if (member && (PRIVILEGED_ROLES as readonly string[]).includes(member.role)) return app as JobApplicationRow

  const { data: offer } = await service
    .from('job_offers')
    .select('created_by')
    .eq('id', app.job_offer_id)
    .maybeSingle()
  if (offer?.created_by && offer.created_by === user.id) return app as JobApplicationRow

  return null
}

/** Storage path of a CV inside the cv-uploads bucket, from its stored public URL. */
function cvStoragePath(cvUrl: string): string | null {
  const marker = `/${CV_BUCKET}/`
  const idx = cvUrl.indexOf(marker)
  if (idx === -1) return null
  const path = cvUrl.slice(idx + marker.length).split('?')[0]
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/** Time-limited signed URL for a CV (the bucket may be public, but links we hand out expire). */
export async function signedCvUrl(cvUrl: string | null, expiresInSeconds: number): Promise<string | null> {
  if (!cvUrl) return null
  const path = cvStoragePath(cvUrl)
  if (!path) return null
  const service = createServiceClient()
  const { data, error } = await service.storage.from(CV_BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}
