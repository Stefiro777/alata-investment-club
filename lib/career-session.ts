import type { SupabaseClient } from '@supabase/supabase-js'

/** Every Career session lasts 30 minutes. */
export const CAREER_SESSION_MINUTES = 30

/** settings.key holding the single session price, in cents (text). */
export const CAREER_PRICE_KEY = 'career_session_price_cents'

/** Used when the settings row is missing or not a valid non-negative integer. */
export const DEFAULT_SESSION_PRICE_CENTS = 3000

export async function getSessionPriceCents(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from('settings').select('value').eq('key', CAREER_PRICE_KEY).maybeSingle()
  const cents = Number(data?.value)
  return Number.isInteger(cents) && cents >= 0 ? cents : DEFAULT_SESSION_PRICE_CENTS
}

type MembershipFields = {
  membership_expires_at: string | null
  membership_removed_at: string | null
}

/** Active = not removed from the membership and not expired. */
export function isMembershipActive(member: MembershipFields | null | undefined): boolean {
  if (!member || member.membership_removed_at) return false
  return !!member.membership_expires_at && new Date(member.membership_expires_at) > new Date()
}

/** The club member behind a `Bearer <access token>` header, or null. */
export async function getMemberFromAuthHeader(
  supabase: SupabaseClient,
  authHeader: string | null,
): Promise<(MembershipFields & { id: string }) | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7))
  if (!user?.email) return null
  const { data: member } = await supabase
    .from('club_members')
    .select('id, membership_expires_at, membership_removed_at')
    .eq('email', user.email)
    .maybeSingle()
  return member ?? null
}

export type SessionPricing = {
  /** List price of a session. */
  price_cents: number
  duration_minutes: number
  /** The caller is a club member (even if the membership is not active). */
  is_member: boolean
  /** The caller is a member whose membership is expired or removed. */
  membership_inactive: boolean
  /** What this caller pays: 0 for active members, the list price otherwise. */
  effective_price_cents: number
}

/** Single source of truth for price/duration, always computed server-side. */
export async function getSessionPricing(supabase: SupabaseClient, authHeader: string | null): Promise<SessionPricing> {
  const [price_cents, member] = await Promise.all([
    getSessionPriceCents(supabase),
    getMemberFromAuthHeader(supabase, authHeader),
  ])
  const active = isMembershipActive(member)
  return {
    price_cents,
    duration_minutes: CAREER_SESSION_MINUTES,
    is_member: !!member,
    membership_inactive: !!member && !active,
    effective_price_cents: active ? 0 : price_cents,
  }
}
