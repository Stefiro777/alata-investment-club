import { createClient } from '@/lib/supabase-server'
import AdminNavbar from '../components/AdminNavbar'
import PartnersSection from '../components/PartnersSection'
import type { Partner } from '@/lib/types'

/** Site · Partners: partners and sponsors shown on /partners (board ABs3). */
export default async function AdminPartnersPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partners')
    .select('id, name, logo_url, website_url, description, type, order_index, click_count, created_at, is_hidden')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  return (
    <>
      <AdminNavbar />
      <PartnersSection initialPartners={(data ?? []) as Partner[]} />
    </>
  )
}
