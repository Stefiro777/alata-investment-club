// Metrics shown in the stats band of the About page (homepage). Stored as a
// JSON array under settings.key = 'about_stats' and edited from the Board Overview.

export type AboutStat = { value: string; label: string }

export const ABOUT_STATS_KEY = 'about_stats'
export const ABOUT_STATS_COUNT = 4

export const DEFAULT_ABOUT_STATS: AboutStat[] = [
  { value: '100+', label: 'Members' },
  { value: '50+', label: 'Speaker sessions' },
  { value: '500+', label: 'Analyses published' },
  { value: '190K+', label: 'Annual reach' },
]

/** Parses the stored JSON; falls back to the defaults on anything malformed. */
export function parseAboutStats(raw: string | null | undefined): AboutStat[] {
  if (!raw) return DEFAULT_ABOUT_STATS
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_ABOUT_STATS
    const stats = parsed
      .map(item => {
        const o = item as { value?: unknown; label?: unknown }
        return {
          value: typeof o?.value === 'string' ? o.value.trim().slice(0, 16) : '',
          label: typeof o?.label === 'string' ? o.label.trim().slice(0, 60) : '',
        }
      })
      .filter(s => s.value && s.label)
      .slice(0, ABOUT_STATS_COUNT)
    return stats.length > 0 ? stats : DEFAULT_ABOUT_STATS
  } catch {
    return DEFAULT_ABOUT_STATS
  }
}
