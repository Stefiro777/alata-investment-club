import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: member } = await supabase
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()

  const isSuperAdmin = user.email === 'finullistefano@gmail.com'
  const hasAccess = isSuperAdmin || member?.role === 'bod' || member?.role === 'director'

  if (!hasAccess) redirect('/dashboard')

  return <>{children}</>
}
