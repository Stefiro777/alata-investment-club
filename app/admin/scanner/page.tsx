import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import EventScanner from '@/components/admin/EventScanner'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminScannerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  if (user.email !== 'finullistefano@gmail.com') {
    const { data: member } = await supabaseAdmin
      .from('club_members')
      .select('role')
      .eq('email', user.email!)
      .maybeSingle()
    if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')
  }

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <EventScanner />
      </main>
    </>
  )
}
