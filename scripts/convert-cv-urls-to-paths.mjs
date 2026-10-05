#!/usr/bin/env node
// Step 1 of the cv-uploads privacy switch: convert the PUBLIC URLs stored in
// job_applications.cv_url and career_bookings.cv_url into storage paths.
//
//   node scripts/convert-cv-urls-to-paths.mjs            # dry run (default): prints what would change
//   node scripts/convert-cv-urls-to-paths.mjs --apply    # writes the changes
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
// (for example: node --env-file=.env.local scripts/convert-cv-urls-to-paths.mjs).
// Idempotent: values that are already paths are left alone. Rows are matched by
// id and only cv_url is touched. Nothing is deleted; the original value is
// printed so a rollback is possible from the log.

import { createClient } from '@supabase/supabase-js'

const apply = process.argv.includes('--apply')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const MARKER = '/cv-uploads/'

function toPath(value) {
  if (!/^https?:\/\//i.test(value)) return null // already a path
  const idx = value.indexOf(MARKER)
  if (idx === -1) return null
  const raw = value.slice(idx + MARKER.length).split('?')[0]
  let decoded = raw
  try { decoded = decodeURIComponent(raw) } catch { /* keep raw */ }
  return decoded && !decoded.includes('..') && !decoded.startsWith('/') ? decoded : null
}

let changed = 0
let skipped = 0
for (const table of ['job_applications', 'career_bookings']) {
  const { data, error } = await supabase.from(table).select('id, cv_url').not('cv_url', 'is', null)
  if (error) { console.error(table, error.message); process.exit(1) }
  for (const row of data) {
    const path = toPath(row.cv_url)
    if (!path) { skipped++; continue }

    // Make sure the object really exists before touching the row.
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : ''
    const file = path.slice(path.lastIndexOf('/') + 1)
    const { data: list, error: listErr } = await supabase.storage.from('cv-uploads').list(dir, { search: file })
    if (listErr || !list?.some(o => o.name === file)) {
      console.warn(`[${table}] ${row.id}: object not found for "${path}" — left unchanged`)
      skipped++
      continue
    }

    console.log(`[${table}] ${row.id}\n   ${row.cv_url}\n-> ${path}`)
    if (apply) {
      const { error: upErr } = await supabase.from(table).update({ cv_url: path }).eq('id', row.id)
      if (upErr) { console.error('   update failed:', upErr.message); process.exit(1) }
    }
    changed++
  }
}
console.log(`\n${apply ? 'Converted' : 'Would convert'}: ${changed}; unchanged: ${skipped}${apply ? '' : '  (dry run, nothing written)'}`)
