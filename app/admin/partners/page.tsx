import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminShell from '../AdminShell'
import AdminClient from '../AdminClient'
import type { Partner } from '@/lib/types'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  immagine_url: string | null
  photos: string[] | null
}

export default async function AdminPartnersPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()
  if (!adminRow) redirect('/login')

  const { data: partnersData } = await supabase
    .from('partners')
    .select('id, name, logo_url, website_url, order_index, click_count, created_at')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  return (
    <AdminShell userEmail={user.email ?? ''}>
      <AdminClient items={[] as Contenuto[]} resources={[]} partners={(partnersData ?? []) as Partner[]} />
    </AdminShell>
  )
}
