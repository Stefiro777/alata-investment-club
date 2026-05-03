import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import ArchiveClient from './ArchiveClient'

export default async function AdminArchivePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: adminRow } = await supabase
    .from('admin_users').select('email').eq('email', user.email).maybeSingle()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!adminRow && profile?.role !== 'bod' && profile?.role !== 'director') redirect('/dashboard')

  const serviceClient = createServiceClient()
  const { data: docs } = await serviceClient
    .from('admin_documents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <ArchiveClient initialDocs={docs ?? []} userEmail={user.email ?? ''} />
      </main>
    </>
  )
}
