/**
 * Where an invitation stands: waiting, accepted (used_at) or cancelled (revoked_at).
 * Rows are never deleted: a cancelled invitation keeps its token and is simply refused.
 */

import { quarterOf } from './application-archive.ts'

export type InviteRow = {
  used_at?: string | null
  revoked_at?: string | null
  created_at?: string
}

export type InviteStatus = 'pending' | 'accepted' | 'cancelled'

/** An accepted invitation stays accepted, even if a cancellation was written after. */
export function inviteStatus(inv: Pick<InviteRow, 'used_at' | 'revoked_at'>): InviteStatus {
  if (inv.used_at) return 'accepted'
  if (inv.revoked_at) return 'cancelled'
  return 'pending'
}

export const isPendingInvite = (inv: Pick<InviteRow, 'used_at' | 'revoked_at'>) => inviteStatus(inv) === 'pending'

/** When the invitation stopped waiting: the day it was accepted, or cancelled. */
export const inviteClosedAt = (inv: InviteRow) => inv.used_at || inv.revoked_at || inv.created_at || ''

export type AcceptCheck =
  | { ok: true }
  | { ok: false; status: 404 | 410; code: 'not_found' | 'used' | 'cancelled'; error: string }

/** What /accept-invite says about a token, for the GET and again for the POST that creates the account. */
export function checkInviteForAccept(inv: Pick<InviteRow, 'used_at' | 'revoked_at'> | null | undefined): AcceptCheck {
  if (!inv) return { ok: false, status: 404, code: 'not_found', error: 'Invite not found' }
  const status = inviteStatus(inv)
  if (status === 'accepted') return { ok: false, status: 410, code: 'used', error: 'Invite already used' }
  if (status === 'cancelled') return { ok: false, status: 410, code: 'cancelled', error: 'This invitation was cancelled' }
  return { ok: true }
}

/** The archive: accepted and cancelled invitations, one group per quarter (latest first), latest first inside. */
export function inviteArchiveGroups<T extends InviteRow>(invites: readonly T[]): { key: string; label: string; invites: T[] }[] {
  const groups = new Map<string, { key: string; label: string; invites: T[] }>()
  for (const inv of invites) {
    if (isPendingInvite(inv)) continue
    const { key, label } = quarterOf(inviteClosedAt(inv))
    const g = groups.get(key) ?? { key, label, invites: [] }
    g.invites.push(inv)
    groups.set(key, g)
  }
  return [...groups.values()]
    .sort((x, y) => (x.key < y.key ? 1 : -1))
    .map(g => ({ ...g, invites: [...g.invites].sort((p, q) => (inviteClosedAt(p) < inviteClosedAt(q) ? 1 : -1)) }))
}

/** Postgres 42703: the column does not exist yet (the revoked_at SQL has not been run). */
export const isMissingColumn = (error: { code?: string; message?: string } | null | undefined) =>
  !!error && (error.code === '42703' || /column .*(revoked_at|revoked_by).* does not exist/i.test(error.message ?? ''))
