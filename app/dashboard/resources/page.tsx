import { redirect } from 'next/navigation'

// The resources now live at the bottom of Career Resources (board ACad).
export default function ResourcesPage() {
  redirect('/dashboard/career-resources#resources')
}
