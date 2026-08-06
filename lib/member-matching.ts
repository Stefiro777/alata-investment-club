// Shared "is this registration a club member?" matching logic, used by both
// the participation and events-breakdown analytics routes so the heuristic
// stays identical across the dashboard.
//
// Known limitation (accepted, not a bug): name-based matching can produce
// false positives for homonyms (two different people with the same normalized
// name). This is why `member_override` exists on event_registrations — it's
// the manual correction path for cases where the automatic match is wrong.

export type MemberRecord = {
  email: string
  full_name: string
  member_id: string | null
}

export type MemberIndex = {
  byEmail: Map<string, MemberRecord>
  byName: Map<string, MemberRecord>
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Lowercase, strip diacritics (NFD + combining marks removal), trim, and
// collapse internal whitespace to a single space.
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function buildMemberIndex(members: MemberRecord[]): MemberIndex {
  const byEmail = new Map<string, MemberRecord>()
  const byName = new Map<string, MemberRecord>()
  for (const m of members) {
    if (m.email) byEmail.set(normalizeEmail(m.email), m)
    if (m.full_name) byName.set(normalizeName(m.full_name), m)
  }
  return { byEmail, byName }
}

// Matches a registration (email + separate nome/cognome) against the member
// index. Tries email first, then both "nome cognome" and "cognome nome"
// orderings against club_members.full_name (full_name is a single free-text
// field with no guaranteed order).
export function matchMember(
  index: MemberIndex,
  email: string,
  nome: string,
  cognome: string
): MemberRecord | null {
  const byEmail = index.byEmail.get(normalizeEmail(email))
  if (byEmail) return byEmail

  const nomeCognome = normalizeName(`${nome} ${cognome}`)
  const cognomeNome = normalizeName(`${cognome} ${nome}`)
  return index.byName.get(nomeCognome) ?? index.byName.get(cognomeNome) ?? null
}

// Final member flag for a registration: an explicit member_override always
// wins; otherwise fall back to the automatic email-or-name match.
export function resolveIsMember(
  index: MemberIndex,
  email: string,
  nome: string,
  cognome: string,
  memberOverride: boolean | null
): { isMember: boolean; memberId: string | null } {
  const auto = matchMember(index, email, nome, cognome)
  if (memberOverride !== null) {
    return { isMember: memberOverride, memberId: memberOverride ? (auto?.member_id ?? null) : null }
  }
  return { isMember: auto !== null, memberId: auto?.member_id ?? null }
}
