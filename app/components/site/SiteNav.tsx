import { unstable_noStore as noStore } from 'next/cache'
import { createServiceClient } from '@/lib/supabase-server'
import SiteNavClient, { type NavTone } from './SiteNavClient'

/**
 * Public navbar, identical on every public page. `tone` is the background
 * the bar sits on: 'dark' shows the light logo and ivory links, 'light'
 * the dark logo and night links. The bar overlays the top of the page, so
 * pages leave room for it (about 96px on desktop).
 */
export default async function SiteNav({ tone = 'dark', bigLogo = false }: { tone?: NavTone; bigLogo?: boolean }) {
  noStore()
  const { data } = await createServiceClient()
    .from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()
  return <SiteNavClient tone={tone} bigLogo={bigLogo} merchVisible={data?.value === 'true'} />
}
