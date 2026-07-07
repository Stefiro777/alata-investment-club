import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { requirePrivilegedAccess } from '@/lib/auth'
import AdminNavbar from '../components/AdminNavbar'
import TeamClient from '../team/TeamClient'
import AlumniSection from '../components/AlumniSection'
import AlumniCompaniesSection from '../components/AlumniCompaniesSection'
import type { Alumni, AlumniCompany } from '@/lib/types'
import type { TeamMember } from '../team/page'

export default async function AdminPeoplePage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()

  const [
    { data: teamMembersData },
    { data: alumniRaw, error: alumniError },
    { data: alumniCompaniesData },
  ] = await Promise.all([
    supabase
      .from('team_members')
      .select('id, name, role, photo_url, linkedin_url, type, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('alumni')
      .select('id, name, role, graduation_year, linkedin_url, current_company, industry, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('alumni_companies')
      .select('id, name, logo_url, website_url, created_at')
      .order('created_at', { ascending: false }),
  ])

  const alumniData = alumniError
    ? (await supabase
        .from('alumni')
        .select('id, name, role, graduation_year, linkedin_url, current_company, industry, created_at')
        .order('created_at', { ascending: true })).data
    : alumniRaw

  return (
    <>
      <AdminNavbar userEmail={member.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        {/* TeamClient has its own max-w-5xl wrapper */}
        <TeamClient members={(teamMembersData ?? []) as TeamMember[]} />
        <div className="border-t border-line-faint" />
        <div className="max-w-5xl mx-auto px-8 py-10 space-y-16">
          <AlumniSection initialAlumni={(alumniData ?? []) as Alumni[]} />
          <hr className="border-line-faint" />
          <AlumniCompaniesSection initialCompanies={(alumniCompaniesData ?? []) as AlumniCompany[]} />
        </div>
      </main>
    </>
  )
}
