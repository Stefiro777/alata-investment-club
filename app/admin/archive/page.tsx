import { createClient, createServiceClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import ArchiveClient from './ArchiveClient'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminArchivePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')

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
