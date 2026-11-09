// Names that open the "In good company" credits on the Home, before the partners.
// Stored as a JSON array of strings under settings.key = 'flagship_credits' and
// edited from Board > Site > Settings. When the key does not exist yet, the
// four historical names below are used.

export const FLAGSHIP_CREDITS_KEY = 'flagship_credits'
export const FLAGSHIP_CREDITS_MAX = 12
export const FLAGSHIP_CREDIT_MAX_LENGTH = 80

export const DEFAULT_FLAGSHIP_CREDITS = [
  'Private Banker Day',
  'Borsa Italiana',
  'EssilorLuxottica',
  'Bellini Nautica Group',
]

/** Trims, drops empties and case-insensitive duplicates, keeps the order. */
export function cleanFlagshipCredits(names: readonly unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of names) {
    if (typeof item !== 'string') continue
    const name = item.trim().slice(0, FLAGSHIP_CREDIT_MAX_LENGTH)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push(name)
    if (out.length >= FLAGSHIP_CREDITS_MAX) break
  }
  return out
}

/** Missing or malformed value -> the four defaults. A stored empty list stays empty. */
export function parseFlagshipCredits(raw: string | null | undefined): string[] {
  if (raw == null) return [...DEFAULT_FLAGSHIP_CREDITS]
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEFAULT_FLAGSHIP_CREDITS]
    return cleanFlagshipCredits(parsed)
  } catch {
    return [...DEFAULT_FLAGSHIP_CREDITS]
  }
}

/** Flagship names first, then the visible partners that are not already listed. */
export function buildCredits(flagship: readonly string[], partnerNames: readonly string[]): string[] {
  const taken = new Set(flagship.map(n => n.toLowerCase()))
  return [...flagship, ...partnerNames.filter(n => !taken.has(n.toLowerCase()))]
}
