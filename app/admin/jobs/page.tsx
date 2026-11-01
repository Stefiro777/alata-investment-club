import { redirect } from 'next/navigation'

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
  archived: boolean
}

// The applications to job offers moved to the Career team page.
export default function AdminJobsPage() {
  redirect('/dashboard/career/applications')
}
