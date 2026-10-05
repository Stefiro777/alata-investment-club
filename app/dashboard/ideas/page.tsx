import { redirect } from 'next/navigation'

// The "Idee" section is hidden from the dashboard. The `ideas` table is left
// untouched; the previous page lives in git history if it needs to come back.
export default function IdeasPage() {
  redirect('/dashboard')
}
