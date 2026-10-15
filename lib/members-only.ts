import { createClient, createServiceClient } from '@/lib/supabase-server'
import { getSessionMember } from '@/lib/auth'

export type MemberAccess = {
  /** A logged-in Supabase user exists (member or not). */
  authenticated: boolean
  /** Logged in, in club_members, not removed, and the membership has not expired. */
  active: boolean
}

/**
 * Verified membership of the current cookie session. This is what the
 * "members only" events rely on: it is evaluated server-side, never from a
 * client-supplied flag.
 */
export async function getMemberAccess(): Promise<MemberAccess> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { authenticated: false, active: false }

  const member = await getSessionMember()
  if (!member || member.membership_removed_at) return { authenticated: true, active: false }

  const { data } = await createServiceClient()
    .from('club_members')
    .select('membership_expires_at')
    .eq('id', member.id)
    .maybeSingle()
  const active = !!data?.membership_expires_at && new Date(data.membership_expires_at) > new Date()
  return { authenticated: true, active }
}

export const MEMBERS_ONLY_ERROR = 'This event is reserved for verified club members.'
