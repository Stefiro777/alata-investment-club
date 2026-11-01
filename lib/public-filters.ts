// Content that must never appear on the public site (design-reference/NOTES.md:
// "Paintball (ASD Paintball Franciacorta) escluso ovunque"). Applied to the
// public queries only; the rows stay in the database and in the admin.

const EXCLUDED = [/paintball/i]

export function isPubliclyHidden(text: string | null | undefined): boolean {
  if (!text) return false
  return EXCLUDED.some(re => re.test(text))
}

export function publicOnly<T>(rows: T[] | null | undefined, pick: (row: T) => string | null | undefined): T[] {
  return (rows ?? []).filter(row => !isPubliclyHidden(pick(row)))
}
