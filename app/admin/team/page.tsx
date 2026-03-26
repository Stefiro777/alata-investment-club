import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'

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
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()

  if (!adminRow) redirect('/login')

  const { data: membersData } = await supabase
    .from('team_members')
    .select('id, name, role, photo_url, linkedin_url, type, order_index, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <div className="bg-[#1a4a3a] text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-medium">Admin — Team Management</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Content
            </a>
            <a
              href="/admin/members"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Members
            </a>
            <a
              href="/dashboard"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
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
