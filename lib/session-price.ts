/** Price of a 30-minute Career session: settings.career_session_price_cents (text, in cents). */

export const SESSION_PRICE_KEY = 'career_session_price_cents'
const DEFAULT_CENTS = 3000
const MAX_CENTS = 100_000

/** "3000" → "30,00"; anything that is not a whole number of cents falls back to the default. */
export function formatSessionPrice(stored: string | null | undefined): string {
  const cents = Number(stored)
  const ok = stored != null && stored !== '' && Number.isInteger(cents) && cents >= 0
  return ((ok ? cents : DEFAULT_CENTS) / 100).toFixed(2).replace('.', ',')
}

/** What the admin typed ("30", "30,50", "€ 30.5") → cents, or the message to show. */
export function parseSessionPrice(input: string): { cents: number } | { error: string } {
  const normalized = input.trim().replace(/^€\s*/, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return { error: 'Enter a valid amount, for example 30 or 30,50.' }
  const cents = Math.round(parseFloat(normalized) * 100)
  if (cents > MAX_CENTS) return { error: 'Amount too high (1,000 € at most).' }
  return { cents }
}
