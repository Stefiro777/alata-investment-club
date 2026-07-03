import { createClient, createServiceClient } from '@/lib/supabase-server'

// 'director' is the DB value for the "Management" role.
export const PRIVILEGED_ROLES = ['bod', 'director'] as const

export type AuthMember = {
  id: string
  user_id: string | null
  email: string
  full_name: string
  role: string
  teams: string[] | null
}

const MEMBER_COLUMNS = 'id, user_id, email, full_name, role, teams'

/**
 * Resolves the club_members row for the current session user (cookie-based
 * Supabase session). Returns null when unauthenticated or not a club member.
 * The member lookup uses the service client so it keeps working when RLS on
 * club_members is restricted.
 */
export async function getSessionMember(): Promise<AuthMember | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const service = createServiceClient()

  const { data: byUserId } = await service
    .from('club_members')
    .select(MEMBER_COLUMNS)
    .eq('user_id', user.id)
    .maybeSingle()
  if (byUserId) return byUserId as AuthMember

  // Members are created by email and linked to user_id on first dashboard
  // visit, so fall back to the email lookup.
  if (!user.email) return null
  const { data: byEmail } = await service
    .from('club_members')
    .select(MEMBER_COLUMNS)
    .eq('email', user.email)
    .maybeSingle()
  return (byEmail as AuthMember | null) ?? null
}

function isPrivileged(member: AuthMember): boolean {
  return (PRIVILEGED_ROLES as readonly string[]).includes(member.role)
}

/**
 * Global privileged access: BoD + Management ('bod', 'director').
 * Returns the member when allowed, null otherwise — callers respond 401/403
 * on null.
 */
export async function requirePrivilegedAccess(): Promise<AuthMember | null> {
  const member = await getSessionMember()
  if (!member || !isPrivileged(member)) return null
  return member
}

/**
 * Team-scoped access: privileged roles always pass; otherwise the member must
 * belong to at least one of the given teams (club_members.teams array).
 */
export async function requireTeamAccess(...teamSlugs: string[]): Promise<AuthMember | null> {
  const member = await getSessionMember()
  if (!member) return null
  if (isPrivileged(member)) return member
  const teams = member.teams ?? []
  if (teamSlugs.some(slug => teams.includes(slug))) return member
  return null
}
