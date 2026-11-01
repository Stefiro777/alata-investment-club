import { redirect } from 'next/navigation'

// The resources now live at the bottom of Job Offers (board ACad).
export default function ResourcesPage() {
  redirect('/dashboard/jobs#resources')
}
