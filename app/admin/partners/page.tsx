import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import PartnersSection from '../components/PartnersSection'
import type { Partner } from '@/lib/types'

export default async function AdminPartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: adminRow } = await supabase
    .from('admin_users').select('email').eq('email', user.email).maybeSingle()
  if (!adminRow) redirect('/dashboard')

  const { data: partnersData } = await supabase
    .from('partners')
    .select('id, name, logo_url, website_url, order_index, click_count, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <PartnersSection initialPartners={(partnersData ?? []) as Partner[]} />
        </div>
      </main>
    </>
  )
}
