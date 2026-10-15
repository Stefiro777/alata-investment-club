// Phone validation shared by client forms and server routes.
// International prefix is allowed (+39, 0039) but not required; the stored
// value is normalised to digits with an optional leading "+".

export const PHONE_ERROR = 'Enter a valid phone number, e.g. +39 333 123 4567.'

/** Returns the normalised number, or null when the input is not a valid phone. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null
  let s = input.trim().replace(/[\s().-]/g, '')
  if (s.startsWith('00')) s = '+' + s.slice(2)
  if (!/^\+?[1-9]\d{6,14}$/.test(s) && !/^0\d{5,14}$/.test(s)) return null
  return s
}

export function isValidPhone(input: unknown): boolean {
  return normalizePhone(input) !== null
}
