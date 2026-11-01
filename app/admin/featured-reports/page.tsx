import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import FeaturedReportsClient from './FeaturedReportsClient'
import AdminNavbar from '../components/AdminNavbar'
import type { FeaturedReport } from '@/lib/types'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function FeaturedReportsAdminPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()
  const { data } = await supabase
    .from('featured_reports')
    .select('id, title, description, image_url, pdf_url, authors, display_order, created_at')
    .order('display_order', { ascending: true })

  return (
    <>
      <AdminNavbar />
      <p className="-mt-4 mb-8 text-[13px] text-earth-600">PDF reports in evidence on /reports. The archive of LinkedIn posts fills itself through the Make automation.</p>
      <FeaturedReportsClient reports={(data ?? []) as FeaturedReport[]} />
    </>
  )
}
