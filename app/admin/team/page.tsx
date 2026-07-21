import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'
import { requirePrivilegedAccess } from '@/lib/auth'

export type TeamMember = {
  id: string
  name: string
  role: string
  photo_url: string | null
  linkedin_url: string | null
  type: string
  order_index: number | null
  created_at: string
}

export default async function AdminTeamPage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()
  const { data: membersData } = await supabase
    .from('team_members')
    .select('id, name, role, photo_url, linkedin_url, type, order_index, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-paper-stone">
      <div className="bg-forest text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-serif text-xl font-medium">Admin — Team Management</h1>
            <p className="text-white/50 text-xs mt-0.5">{member.email}</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <a
              href="/admin"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast w-full sm:w-auto text-center"
            >
              Content
            </a>
            <a
              href="/admin/members"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast w-full sm:w-auto text-center"
            >
              Members
            </a>
            <a
              href="/dashboard"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast w-full sm:w-auto text-center"
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>

      <TeamClient members={(membersData ?? []) as TeamMember[]} />
    </div>
  )
}
