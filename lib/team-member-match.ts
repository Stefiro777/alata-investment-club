/**
 * Suggested links between the rows of team_members (the public /team page) and club members.
 * It only suggests: nothing is written until someone confirms a pair in /admin/people.
 *
 *  - exact:    the same name (case, accents and extra spaces ignored), one active member only.
 *  - probable: every word of the team name is in the member's name ("Luca Pialorsi" →
 *              "Luca Paolo Pialorsi"), one active member only.
 * Anything ambiguous gets no suggestion. Members who left the club, and members already
 * linked to another row, are never suggested.
 */

export type TeamRow = { id: string; name: string; member_id?: string | null }

export type MemberCandidate = {
  id: string
  full_name: string
  membership_removed_at?: string | null
}

export type MatchKind = 'exact' | 'probable'

export type LinkSuggestion<M extends MemberCandidate> = { teamId: string; kind: MatchKind; member: M }

const words = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

const sameName = (a: string[], b: string[]) => a.length === b.length && a.every((w, i) => w === b[i])
const containsAll = (member: string[], team: string[]) => team.length >= 2 && team.every(w => member.includes(w))

export function suggestLinks<M extends MemberCandidate>(team: readonly TeamRow[], members: readonly M[]): LinkSuggestion<M>[] {
  const taken = new Set(team.map(t => t.member_id).filter(Boolean) as string[])
  const candidates = members
    .filter(m => !m.membership_removed_at && !taken.has(m.id))
    .map(m => ({ member: m, words: words(m.full_name) }))

  const out: LinkSuggestion<M>[] = []
  for (const row of team) {
    if (row.member_id) continue
    const target = words(row.name)
    if (target.length === 0) continue

    const exact = candidates.filter(c => sameName(c.words, target))
    if (exact.length === 1) { out.push({ teamId: row.id, kind: 'exact', member: exact[0].member }); continue }
    if (exact.length > 1) continue // two members with the same name: a person must choose

    const probable = candidates.filter(c => containsAll(c.words, target))
    if (probable.length === 1) out.push({ teamId: row.id, kind: 'probable', member: probable[0].member })
  }

  // A member suggested for two different rows is ambiguous: neither is proposed.
  const count = new Map<string, number>()
  for (const s of out) count.set(s.member.id, (count.get(s.member.id) ?? 0) + 1)
  return out.filter(s => count.get(s.member.id) === 1)
}
