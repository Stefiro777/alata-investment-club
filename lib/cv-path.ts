// Pure helpers for CV references stored in the DB (job_applications.cv_url,
// career_bookings.cv_url). The column keeps its name, but new rows hold the
// STORAGE PATH inside the cv-uploads bucket (e.g. "career-bookings/<uuid>-cv.pdf");
// rows created before the switch hold the old public URL until the conversion
// script (scripts/convert-cv-urls-to-paths.mjs) has run. Readers accept both.

export const CV_BUCKET = 'cv-uploads'

/** Paths the app itself generates: "<folder>/<something>", no traversal. */
function isSafePath(p: string): boolean {
  return p.length > 0 && !p.startsWith('/') && !p.includes('..') && !/^[a-z]+:/i.test(p)
}

/** Storage path for a stored value (a path, or a legacy public URL); null if unusable. */
export function cvStoragePath(value: string | null | undefined): string | null {
  if (!value) return null
  if (/^https?:\/\//i.test(value)) {
    const marker = `/${CV_BUCKET}/`
    const idx = value.indexOf(marker)
    if (idx === -1) return null
    const raw = value.slice(idx + marker.length).split('?')[0]
    let decoded = raw
    try { decoded = decodeURIComponent(raw) } catch { /* keep raw */ }
    return isSafePath(decoded) ? decoded : null
  }
  return isSafePath(value) ? value : null
}

/** Paths accepted from the career booking form (made by /api/career/upload-cv). */
export function isCareerCvPath(value: unknown): value is string {
  return typeof value === 'string' && /^career-bookings\/[0-9a-f-]{36}-[^/]+$/i.test(value) && !value.includes('..')
}
