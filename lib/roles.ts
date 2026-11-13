/**
 * Roles of club_members.role. 'director' is the DB value of "Management": the
 * RLS policies and PRIVILEGED_ROLES (lib/auth.ts) know it by that name.
 *
 * A member's role is their main team (the first of TEAM_ROLE_PRIORITY found in
 * club_members.teams); the teams array stays the only source of team permissions.
 * Analysts are the operative roles (Lab, Media, Events); Members are the others.
 */

export const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'lab', label: 'Lab' },
  { value: 'media', label: 'Media' },
  { value: 'career', label: 'Career' },
  { value: 'events', label: 'Events' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'bod', label: 'BoD' },
  { value: 'director', label: 'Management' },
] as const

export type Role = (typeof ROLES)[number]['value']

/** Operative roles: the people who work on Lab, Media and Events. */
export const ANALYST_ROLES: readonly string[] = ['lab', 'media', 'events']

/** Which team gives the role when a member belongs to several. */
export const TEAM_ROLE_PRIORITY = ['lab', 'media', 'events', 'career', 'alumni'] as const

const LABELS: Record<string, string> = {
  ...Object.fromEntries(ROLES.map(r => [r.value, r.label])),
  management: 'Management', // older rows and screens
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return '—'
  return LABELS[role] ?? role.charAt(0).toUpperCase() + role.slice(1)
}

/** The role a member gets from their teams: the main team, or 'member'. */
export function roleForTeams(teams: readonly string[] | null | undefined): Role {
  return TEAM_ROLE_PRIORITY.find(t => teams?.includes(t)) ?? 'member'
}

/** The role for an invitation to a team ('member' = no team). */
export function roleForInviteTeam(team: string | null | undefined): Role {
  return (TEAM_ROLE_PRIORITY as readonly string[]).includes(team ?? '') ? (team as Role) : 'member'
}

/**
 * Analyst = role Lab, Media or Events. Until the roles are migrated every
 * member still has role 'member', so a plain member whose teams include one of
 * those counts as an analyst too.
 */
export function isAnalyst(role: string | null | undefined, teams?: readonly string[] | null): boolean {
  if (role && ANALYST_ROLES.includes(role)) return true
  return role === 'member' && !!teams?.some(t => ANALYST_ROLES.includes(t))
}

/** Postgres error of club_members_role_check: the DB does not know the new roles yet. */
export function isRoleCheckViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  return !!error && (error.code === '23514' || /club_members_role_check/.test(error.message ?? ''))
}

// ── Who can change a role, and what to warn about ────────────────────────────

/** The two roles with global access to the Board. 'director' is Management. */
export const PRIVILEGED_ROLE_VALUES: readonly string[] = ['bod', 'director']

/** Hardcoded superadmin: always keeps BoD or Management. */
export const SUPERADMIN_EMAIL = 'finullistefano@gmail.com'

export const isPrivilegedRole = (role: string | null | undefined) => !!role && PRIVILEGED_ROLE_VALUES.includes(role)
export const isOperativeRole = (role: string | null | undefined) => !!role && (TEAM_ROLE_PRIORITY as readonly string[]).includes(role)

export type RoleChangeCheck = { ok: true } | { ok: false; status: number; error: string }

/**
 * Rules for changing club_members.role, applied by the API (the UI only mirrors them):
 * only BoD and Management change roles; the superadmin and the requester
 * themselves cannot lose BoD / Management.
 */
export function checkRoleChange(p: {
  requesterId: string
  requesterRole: string
  targetId: string
  targetEmail: string | null
  newRole: unknown
}): RoleChangeCheck {
  if (!isPrivilegedRole(p.requesterRole)) return { ok: false, status: 403, error: 'Only the BoD and Management can change roles.' }
  if (typeof p.newRole !== 'string' || !ROLES.some(r => r.value === p.newRole)) return { ok: false, status: 400, error: 'Invalid role.' }
  if (!isPrivilegedRole(p.newRole)) {
    if (p.targetEmail && p.targetEmail.toLowerCase() === SUPERADMIN_EMAIL) {
      return { ok: false, status: 403, error: 'The superadmin always keeps BoD or Management.' }
    }
    if (p.requesterId === p.targetId) {
      return { ok: false, status: 403, error: 'You cannot remove your own BoD or Management role.' }
    }
  }
  return { ok: true }
}

/** Notices for a role that does not match the member's data. They never block the change. */
export function roleWarnings(role: string, teams: readonly string[] | null | undefined, labSubdivision: string | null | undefined): string[] {
  const out: string[] = []
  if (isOperativeRole(role) && !teams?.includes(role)) {
    out.push(`The ${roleLabel(role)} team is not in this member's teams: the role alone gives no team access. Add it in the member's teams.`)
  }
  if (role === 'lab' && !labSubdivision) out.push('This member has no Lab subdivision yet.')
  return out
}
