import type { SupabaseClient } from '@supabase/supabase-js'

/** settings.merch_page_visible: the master switch for /merch (anything but 'true' = hidden). */
export async function isMerchPagePublished(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()
  return data?.value === 'true'
}
