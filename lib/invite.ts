/** Checks of an invitation request (POST /api/invite). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 'member' = a plain member with no team (used by the "member" track of Join Us). */
export const INVITE_TEAMS = ['lab', 'events', 'media', 'alumni', 'member'] as const
export type InviteTeam = (typeof INVITE_TEAMS)[number]

/** Same values as club_members_lab_subdivision_check. */
export const LAB_SUBDIVISIONS = [
  { value: 'macro_markets', label: 'Macro & Markets' },
  { value: 'equity_valuation', label: 'Equity Valuation' },
  { value: 'ma', label: 'M&A' },
] as const

export type InviteInput = { email: string; team: InviteTeam; labSubdivision: string | null }

export function validateInvite(body: unknown): InviteInput | { error: string } {
  const b = (body ?? {}) as { email?: unknown; team?: unknown; lab_subdivision?: unknown }
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_RE.test(email)) return { error: 'Valid email required' }

  const team = b.team as InviteTeam
  if (!INVITE_TEAMS.includes(team)) return { error: 'Invalid team' }

  if (team !== 'lab') return { email, team, labSubdivision: null }

  const sub = typeof b.lab_subdivision === 'string' ? b.lab_subdivision : ''
  if (!sub) return { error: 'Lab subdivision is required' }
  if (!LAB_SUBDIVISIONS.some(s => s.value === sub)) return { error: 'Invalid Lab subdivision' }
  return { email, team, labSubdivision: sub }
}
