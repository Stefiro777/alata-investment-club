import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import FeaturedReportsClient from '../featured-reports/FeaturedReportsClient'
import ContentTabs from './ContentTabs'
import type { FeaturedReport } from '@/lib/types'
import { requirePrivilegedAccess } from '@/lib/auth'

export default async function AdminContentPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()
  const { data: featuredReportsData } = await supabase
    .from('featured_reports')
    .select('id, title, description, pdf_url, authors, display_order')
    .order('display_order', { ascending: true })

  const reportsContent = (
    <FeaturedReportsClient reports={(featuredReportsData ?? []) as FeaturedReport[]} />
  )

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <ContentTabs reportsContent={reportsContent} />
      </main>
    </>
  )
}
