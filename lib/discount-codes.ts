import { createClient, createServiceClient } from '@/lib/supabase-server'
import { getSessionMember } from '@/lib/auth'
import { isMembershipActive } from '@/lib/career-session'

export type DiscountCode = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  active: boolean
  members_only: boolean
}

export type DiscountDenial = 'login_required' | 'not_member' | 'membership_expired'

export const DISCOUNT_DENIAL_MESSAGES: Record<DiscountDenial, string> = {
  login_required:     'Questo codice è riservato ai membri. Accedi per utilizzarlo.',
  not_member:         'Questo codice è riservato ai membri del club.',
  membership_expired: 'La tua membership è scaduta. Rinnovala per utilizzare questo codice.',
}

type MemberState = 'guest' | 'non_member' | 'expired' | 'active'

/**
 * Verified membership of the caller, never from a client-asserted flag: the
 * `Bearer` token (what the checkout sends) first, then the cookie session.
 */
async function getMemberState(authHeader: string | null): Promise<MemberState> {
  const service = createServiceClient()
  const columns = 'membership_expires_at, membership_removed_at'

  if (authHeader?.startsWith('Bearer ')) {
    const { data: { user } } = await service.auth.getUser(authHeader.slice(7))
    if (user) {
      let { data: member } = await service.from('club_members').select(columns).eq('user_id', user.id).maybeSingle()
      if (!member && user.email) {
        ({ data: member } = await service.from('club_members').select(columns).eq('email', user.email).maybeSingle())
      }
      return stateOf(member)
    }
  }

  const member = await getSessionMember()
  if (member) {
    const { data } = await service.from('club_members').select(columns).eq('id', member.id).maybeSingle()
    return stateOf(data)
  }
  // getSessionMember() is null both for guests and for logged-in non-members.
  const { data: { user } } = await (await createClient()).auth.getUser()
  return user ? 'non_member' : 'guest'
}

function stateOf(member: { membership_expires_at: string | null; membership_removed_at: string | null } | null): MemberState {
  if (!member || member.membership_removed_at) return 'non_member'
  return isMembershipActive(member) ? 'active' : 'expired'
}

export type DiscountResult =
  | { ok: true; codeId: string; code: string; discountCents: number; description: string }
  | { ok: false; error: string; status: number; denial?: DiscountDenial }

/** Single source of truth for validating a code and computing its discount. */
export async function resolveDiscount(
  rawCode: string,
  subtotalCents: number,
  authHeader: string | null,
): Promise<DiscountResult> {
  if (!rawCode?.trim()) return { ok: false, error: 'No code provided', status: 400 }

  const { data, error } = await createServiceClient()
    .from('discount_codes')
    .select('*')
    .eq('code', rawCode.trim().toUpperCase())
    .eq('active', true)
    .maybeSingle()

  if (error) return { ok: false, error: 'Server error', status: 500 }
  if (!data) return { ok: false, error: 'Invalid code', status: 400 }

  const dc = data as DiscountCode

  if (dc.expires_at && new Date(dc.expires_at) < new Date()) {
    return { ok: false, error: 'Code has expired', status: 400 }
  }
  if (dc.max_uses !== null && dc.uses_count >= dc.max_uses) {
    return { ok: false, error: 'Code has reached its usage limit', status: 400 }
  }

  if (dc.members_only) {
    const state = await getMemberState(authHeader)
    if (state !== 'active') {
      const denial: DiscountDenial =
        state === 'guest' ? 'login_required' : state === 'expired' ? 'membership_expired' : 'not_member'
      return {
        ok: false,
        error: DISCOUNT_DENIAL_MESSAGES[denial],
        status: denial === 'login_required' ? 401 : 403,
        denial,
      }
    }
  }

  if (dc.type === 'percentage') {
    return {
      ok: true, codeId: dc.id, code: dc.code,
      discountCents: Math.round(subtotalCents * dc.value / 100),
      description: `${dc.value}% off`,
    }
  }
  return {
    ok: true, codeId: dc.id, code: dc.code,
    discountCents: Math.min(dc.value, subtotalCents),
    description: `€${(dc.value / 100).toFixed(2).replace('.', ',')} off`,
  }
}
