import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireTeamAccess } from '@/lib/auth'
import JobApplicationsClient from '@/app/admin/jobs/JobApplicationsClient'
import type { JobApplication } from '@/app/admin/jobs/page'
import { PageTitle } from '@/app/components/member/ui'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Career team: applications received through the Job Offers board (moved from /admin/jobs). */
export default async function CareerApplicationsPage() {
  const member = await requireTeamAccess('career')
  if (!member) redirect('/dashboard')

  const { data: applications } = await supabaseAdmin
    .from('job_applications')
    .select('id, job_offer_id, job_title, first_name, last_name, email, phone, linkedin_url, cover_letter, cv_url, cv_filename, submitted_at, status, archived')
    .order('submitted_at', { ascending: false })

  return (
    <>
      <PageTitle title={<>Job <em>applications</em></>} sub="Applications sent through the Job Offers board. Visible to Career, Management and the BoD." />
      <div className="mt-8 -mx-5 lg:-mx-0">
        <JobApplicationsClient applications={(applications ?? []) as JobApplication[]} />
      </div>
    </>
  )
}
