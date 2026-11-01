import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import ResourcesSection from '../components/ResourcesSection'
import type { Resource } from '@/lib/types'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminDashboardPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()
  const { data: resourcesData } = await supabase
    .from('resources')
    .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <div>
        <div>
          <ResourcesSection initialResources={(resourcesData ?? []) as Resource[]} />
        </div>
      </div>
    </>
  )
}
