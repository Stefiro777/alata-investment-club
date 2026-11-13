import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import FinanceClient from '@/components/admin/FinanceClient'
import { isFinanceTab } from '@/lib/finance-tabs'
import { requirePrivilegedAccess } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const { tab } = await searchParams
  // The accounting documents (the archive) are a tab of this page.
  const { data: docs } = await createServiceClient()
    .from('admin_documents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <div>
        <FinanceClient documents={docs ?? []} userEmail={member.email ?? ''} initialTab={isFinanceTab(tab) ? tab : 'transactions'} />
      </div>
    </>
  )
}
