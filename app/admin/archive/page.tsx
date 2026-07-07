import { createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import ArchiveClient from './ArchiveClient'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminArchivePage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const serviceClient = createServiceClient()
  const { data: docs } = await serviceClient
    .from('admin_documents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <ArchiveClient initialDocs={docs ?? []} userEmail={member.email ?? ''} />
      </main>
    </>
  )
}
