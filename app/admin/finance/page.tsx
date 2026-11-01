import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import FinanceClient from '@/components/admin/FinanceClient'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminFinancePage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <div>
        <FinanceClient />
      </div>
    </>
  )
}
