import { getSessionMember, PRIVILEGED_ROLES, type AuthMember } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export type CareerActor = {
  member: AuthMember
  /** Career team, bod/director: manages every mentor. */
  staff: boolean
  /** The mentor profile linked to this account (career_mentors.member_id), if any. */
  mentorId: string | null
}

/**
 * Who is calling a /api/career/* route: staff (all mentors), a mentor (only their
 * own data) or both. The mentor link is by career_mentors.member_id, never by
 * notification_email (mentors can edit that field themselves). A member removed
 * from the membership keeps no mentor access; privileged roles stay staff, as in
 * requireTeamAccess().
 */
export async function getCareerActor(): Promise<CareerActor | null> {
  const member = await getSessionMember()
  if (!member) return null

  const privileged = (PRIVILEGED_ROLES as readonly string[]).includes(member.role)
  const removed = !!member.membership_removed_at
  const staff = privileged || (!removed && (member.teams ?? []).includes('career'))

  let mentorId: string | null = null
  if (!removed) {
    const { data } = await createServiceClient()
      .from('career_mentors')
      .select('id')
      .eq('member_id', member.id)
      .maybeSingle()
    mentorId = data?.id ?? null
  }

  if (!staff && !mentorId) return null
  return { member, staff, mentorId }
}

/** Staff manage everyone; a mentor only themselves. */
export function canManageMentor(actor: CareerActor, mentorId: string | null | undefined): boolean {
  if (actor.staff) return true
  return !!mentorId && actor.mentorId === mentorId
}
