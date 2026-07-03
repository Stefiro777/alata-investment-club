import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import CRMClient from '@/components/admin/CRMClient'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminCRMPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <CRMClient />
      </main>
    </>
  )
}
