import { redirect } from 'next/navigation'

// The documents are a tab of Finance.
export default function AdminArchivePage() {
  redirect('/admin/finance?tab=documents')
}
