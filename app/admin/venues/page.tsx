import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import VenuesClient from './VenuesClient'

export default async function AdminVenuesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: adminRow } = await supabase
    .from('admin_users').select('email').eq('email', user.email).maybeSingle()
  if (!adminRow) redirect('/dashboard')

  const serviceClient = createServiceClient()
  const { data: venues } = await serviceClient
    .from('venues')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <VenuesClient initialVenues={venues ?? []} />
      </main>
    </>
  )
}
