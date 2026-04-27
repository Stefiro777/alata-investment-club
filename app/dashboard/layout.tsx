import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { DashboardProfileProvider, type MemberProfile } from './DashboardProfileContext'
import DashboardNav from './DashboardNav'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('club_members')
    .select('full_name, role, teams')
    .eq('email', user.email!)
    .maybeSingle()

  if (!profile) {
    return (
      <div className="min-h-screen bg-paper-stone flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="font-serif text-2xl text-ink-900">Profile not found</p>
          <p className="text-sm text-ink-500">Contact admin to get access.</p>
        </div>
      </div>
    )
  }

  const memberProfile: MemberProfile = {
    full_name: (profile as { full_name?: string }).full_name ?? 'Member',
    role: (profile as { role?: string }).role ?? 'member',
    teams: (profile as { teams?: string[] | null }).teams ?? null,
  }

  return (
    <DashboardProfileProvider profile={memberProfile}>
      <DashboardNav profile={memberProfile} />

      {/* Welcome header */}
      <div className="bg-white border-b border-line">
        <div className="max-w-7xl mx-auto px-8 py-10">
          <h1 className="font-serif text-5xl font-semibold text-forest leading-tight">
            Welcome back, {memberProfile.full_name}
          </h1>
          <div className="w-14 h-0.5 bg-forest mt-4" />
        </div>
      </div>

      {/* Page content */}
      {children}
    </DashboardProfileProvider>
  )
}
