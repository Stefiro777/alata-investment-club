import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import ResourcesSection from '../components/ResourcesSection'
import type { Resource } from '@/lib/types'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (user.email !== 'finullistefano@gmail.com' && profile?.role !== 'bod' && profile?.role !== 'director') redirect('/dashboard')

  const { data: resourcesData } = await supabase
    .from('resources')
    .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <ResourcesSection initialResources={(resourcesData ?? []) as Resource[]} />
        </div>
      </main>
    </>
  )
}
