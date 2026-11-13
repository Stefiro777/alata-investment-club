/**
 * "Getting started" on the dashboard: which resources each year of study sees.
 * resources.audience holds tags: 'bachelor' / 'master' (the whole level) and
 * 'bachelor_1' … 'master_2' (one year). Shared by the dashboard and the
 * resource form of the Board, so both apply the same rule.
 */

export type StudyLevel = 'bachelor' | 'master'

/** Years offered as audience in the resource form. */
export const AUDIENCE_GROUPS = [
  { tag: 'bachelor_1', label: 'Bachelor 1', level: 'bachelor', year: 1 },
  { tag: 'bachelor_2', label: 'Bachelor 2', level: 'bachelor', year: 2 },
  { tag: 'bachelor_3', label: 'Bachelor 3', level: 'bachelor', year: 3 },
  { tag: 'master_1', label: 'Master 1', level: 'master', year: 1 },
  { tag: 'master_2', label: 'Master 2', level: 'master', year: 2 },
  { tag: 'bachelor', label: 'All Bachelor', level: 'bachelor', year: null },
  { tag: 'master', label: 'All Master', level: 'master', year: null },
] as const

export function audienceLabel(tag: string): string {
  return AUDIENCE_GROUPS.find(g => g.tag === tag)?.label ?? tag
}

/**
 * The audience tags a member matches, general first. A level with no year gets
 * the level tag (plus the first-year starter set for bachelors); no level at
 * all gets the starter set.
 */
export function audienceTags(level: string | null | undefined, year: number | null | undefined): string[] {
  if (level !== 'bachelor' && level !== 'master') return ['bachelor_1']
  if (year) return [level, `${level}_${year}`]
  return level === 'bachelor' ? [level, 'bachelor_1'] : [level]
}

/** How many resources Getting started shows: 3 for the first year of Bachelor, 4 otherwise. */
export function gettingStartedLimit(level: string | null | undefined, year: number | null | undefined): number {
  return audienceTags(level, year).includes('bachelor_1') ? 3 : 4
}

type Tagged = { audience?: string[] | null }

/** The resources tagged for these tags, the most general tag first, in the given order otherwise. */
export function resourcesForTags<T extends Tagged>(rows: readonly T[], tags: readonly string[]): T[] {
  const rank = (r: T) => Math.min(...(r.audience ?? []).map(a => tags.indexOf(a)).filter(i => i >= 0))
  return rows
    .filter(r => r.audience?.some(a => tags.includes(a)))
    .map((r, i) => ({ r, i, k: rank(r) }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(x => x.r)
}

/** What a member of this level and year sees (before any fallback): at most the limit. */
export function gettingStartedFor<T extends Tagged>(rows: readonly T[], level: string | null | undefined, year: number | null | undefined): T[] {
  return resourcesForTags(rows, audienceTags(level, year)).slice(0, gettingStartedLimit(level, year))
}

/**
 * The years whose Getting started list is longer than its limit, for a list of
 * resources: used by the resource form to warn before something falls off.
 */
export function yearsOverLimit<T extends Tagged>(rows: readonly T[]): { label: string; count: number; limit: number }[] {
  const out: { label: string; count: number; limit: number }[] = []
  for (const g of AUDIENCE_GROUPS) {
    if (g.year === null) continue
    const count = resourcesForTags(rows, audienceTags(g.level, g.year)).length
    const limit = gettingStartedLimit(g.level, g.year)
    if (count > limit) out.push({ label: g.label, count, limit })
  }
  return out
}

/**
 * Years that would show more resources than their limit once `rows` are tagged as
 * they are, among the years a resource tagged `audience` reaches. Used by the form
 * to warn before saving; it never blocks.
 */
export function limitWarnings<T extends Tagged>(rows: readonly T[], audience: readonly string[]): { label: string; count: number; limit: number }[] {
  const out: { label: string; count: number; limit: number }[] = []
  for (const g of AUDIENCE_GROUPS) {
    if (g.year === null) continue
    const tags = audienceTags(g.level, g.year)
    if (!tags.some(t => audience.includes(t))) continue
    const count = resourcesForTags(rows, tags).length
    const limit = gettingStartedLimit(g.level, g.year)
    if (count > limit) out.push({ label: g.label, count, limit })
  }
  return out
}
