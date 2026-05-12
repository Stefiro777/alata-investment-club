import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import JobApplicationsClient from './JobApplicationsClient'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type JobApplication = {
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
  status: string
}

export default async function AdminJobsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')

  const { data: applications } = await supabaseAdmin
    .from('job_applications')
    .select('id, job_offer_id, job_title, first_name, last_name, email, phone, linkedin_url, cover_letter, cv_url, cv_filename, submitted_at, status')
    .order('submitted_at', { ascending: false })

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <JobApplicationsClient applications={(applications ?? []) as JobApplication[]} />
      </main>
    </>
  )
}
