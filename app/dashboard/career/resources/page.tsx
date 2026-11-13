import { redirect } from 'next/navigation'
import { requireTeamAccess } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import ResourcesSection from '@/app/admin/components/ResourcesSection'
import type { Resource } from '@/lib/types'
import { PageTitle } from '@/app/components/member/ui'

/** Career team (and BoD/Management): the resources members see in Career Resources. */
export default async function CareerResourcesPage() {
  const member = await requireTeamAccess('career')
  if (!member) redirect('/dashboard')

  const supabase = await createClient()
  const { data } = await supabase
    .from('resources')
    .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at, audience')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <>
      <PageTitle title={<>Club <em>resources</em></>} sub="Career, Master, Learning and Alata documents: what members find in Career Resources." />
      <div className="mt-8">
        <ResourcesSection initialResources={(data ?? []) as Resource[]} />
      </div>
    </>
  )
}
