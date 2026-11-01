import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'
import BoardShell from '@/app/components/board/BoardShell'

/**
 * The whole Board panel is for BoD and Management only (PRIVILEGED_ROLES,
 * the superadmin is a 'bod' member). Checked here on the server, so no admin
 * screen can be opened by a logged-in member who is not privileged.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirectTo=/admin')
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')
  return <BoardShell>{children}</BoardShell>
}
