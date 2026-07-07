import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import HackathonAdminClient from './HackathonAdminClient'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminHackathonPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <HackathonAdminClient />
      </main>
    </>
  )
}
