import { redirect } from 'next/navigation'

// The site settings moved to the Board Overview.
export default function AdminSettingsPage() {
  redirect('/admin')
}
