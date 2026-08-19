import type { SupabaseClient } from '@supabase/supabase-js'

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function uniqueSlug(
  supabase: SupabaseClient,
  title: string
): Promise<string> {
  const base = slugify(title) || `event-${Date.now().toString(36)}`
  const { data } = await supabase
    .from('upcoming_events')
    .select('slug')
    .like('slug', `${base}%`)

  const taken = new Set((data ?? []).map((r: { slug: string }) => r.slug))
  if (!taken.has(base)) return base

  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
