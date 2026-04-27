import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import DashboardClient from '../DashboardClient'
import type { Resource } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ResourcesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: resourcesData } = await supabase
    .from('resources')
    .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const resources = (resourcesData ?? []) as Resource[]

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Member'

  return <DashboardClient displayName={displayName} resources={resources} />
}
