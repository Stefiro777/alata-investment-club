import { createClient, createServiceClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { requirePrivilegedAccess } from '@/lib/auth'
import AdminNavbar from '../components/AdminNavbar'
import TeamClient, { type LinkableMember } from '../team/TeamClient'
import AlumniSection from '../components/AlumniSection'
import AlumniCompaniesSection from '../components/AlumniCompaniesSection'
import type { Alumni, AlumniCompany } from '@/lib/types'
import type { TeamMember } from '../team/page'

export default async function AdminPeoplePage() {
  const member = await requirePrivilegedAccess()
  if (!member) redirect('/dashboard')

  const supabase = await createClient()

  // team_members.member_id (the link to a club member) exists after the member_id SQL;
  // before it the rows are read without it and the link tools are not shown.
  const teamFields = 'id, name, role, photo_url, linkedin_url, type, order_index, created_at'
  const readTeam = (fields: string) => supabase
    .from('team_members')
    .select(fields)
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
  let linkEnabled = true
  let teamRes = await readTeam(`${teamFields}, member_id`)
  if (teamRes.error?.code === '42703') {
    linkEnabled = false
    teamRes = await readTeam(teamFields)
  }
  const teamMembersData = (teamRes.data ?? []) as unknown as TeamMember[]

  // The club members a row can be linked to (id, name, title, email, photo): read here, on the server.
  let linkable: LinkableMember[] | undefined
  if (linkEnabled) {
    const { data } = await createServiceClient()
      .from('club_members')
      .select('id, full_name, role, title, email, photo_url, membership_removed_at')
      .order('full_name', { ascending: true })
    linkable = (data ?? []) as LinkableMember[]
  }

  const [
    { data: alumniRaw, error: alumniError },
    { data: alumniCompaniesData },
  ] = await Promise.all([
    supabase
      .from('alumni')
      .select('id, name, role, graduation_year, linkedin_url, current_company, industry, photo_url, order_index, created_at')
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
      <div>
        {/* TeamClient has its own max-w-5xl wrapper */}
        <TeamClient members={teamMembersData} linkable={linkable} />
        <div className="border-t border-line-faint" />
        <div className="max-w-5xl mx-auto px-8 py-10 space-y-16">
          <AlumniSection initialAlumni={(alumniData ?? []) as Alumni[]} />
          <hr className="border-line-faint" />
          <AlumniCompaniesSection initialCompanies={(alumniCompaniesData ?? []) as AlumniCompany[]} />
        </div>
      </div>
    </>
  )
}
