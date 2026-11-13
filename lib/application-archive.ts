/**
 * Join Us applications: the ones still to handle stay on top, the accepted and the
 * declined go to an archive grouped by quarter ("Q4 2026"). The quarter is that of the
 * outcome date (applications.reviewed_at), or of the creation date when it is missing.
 */

export type ArchivableApplication = {
  status?: string | null
  created_at: string
  reviewed_at?: string | null
}

/** Accepted (and invited) or declined: nothing left to do. */
export const isClosed = (a: Pick<ArchivableApplication, 'status'>) => a.status === 'accepted' || a.status === 'declined'

export const outcomeDate = (a: ArchivableApplication) => a.reviewed_at || a.created_at

export function quarterOf(iso: string): { key: string; label: string } {
  const d = new Date(iso)
  const q = Math.floor(d.getMonth() / 3) + 1
  const year = d.getFullYear()
  return { key: `${year}-Q${q}`, label: `Q${q} ${year}` }
}

/** The closed applications in one group per quarter, latest quarter first, latest outcome first inside. */
export function archiveGroups<T extends ArchivableApplication>(apps: readonly T[]): { key: string; label: string; apps: T[] }[] {
  const groups = new Map<string, { key: string; label: string; apps: T[] }>()
  for (const a of apps.filter(isClosed)) {
    const { key, label } = quarterOf(outcomeDate(a))
    const g = groups.get(key) ?? { key, label, apps: [] }
    g.apps.push(a)
    groups.set(key, g)
  }
  return [...groups.values()]
    .sort((x, y) => (x.key < y.key ? 1 : -1))
    .map(g => ({ ...g, apps: [...g.apps].sort((p, q) => (outcomeDate(p) < outcomeDate(q) ? 1 : -1)) }))
}
