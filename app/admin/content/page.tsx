import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import FeaturedReportsClient from '../featured-reports/FeaturedReportsClient'
import ContentTabs from './ContentTabs'
import type { FeaturedReport } from '@/lib/types'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')

  const { data: featuredReportsData } = await supabase
    .from('featured_reports')
    .select('id, title, description, pdf_url, authors, display_order')
    .order('display_order', { ascending: true })

  const reportsContent = (
    <FeaturedReportsClient reports={(featuredReportsData ?? []) as FeaturedReport[]} />
  )

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <ContentTabs reportsContent={reportsContent} />
      </main>
    </>
  )
}
