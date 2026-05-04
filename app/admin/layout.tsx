import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminGuard from '@/components/admin/AdminGuard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AdminGuard>{children}</AdminGuard>
}
