import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import type { Resource, Partner } from '@/lib/types'

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

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email)
    .maybeSingle()

  if (!adminRow) redirect('/login')

  const [{ data: items }, { data: resourcesData }, { data: partnersData }] = await Promise.all([
    supabase
      .from('contenuti')
      .select('*')
      .in('tipo', ['evento', 'news', 'aggiornamento'])
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('resources')
      .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('partners')
      .select('id, name, logo_url, website_url, order_index, click_count, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="bg-[#1a4a3a] text-white" style={{ animation: 'heroFadeIn 0.5s ease both' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}>
            <h1 className="font-serif text-xl font-medium">Admin — Content Management</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3 ml-8" style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
            <a
              href="/admin/team"
              className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2"
              style={{ transition: 'border-color 0.2s ease, background-color 0.2s ease' }}
            >
              Team
            </a>
            <a
              href="/admin/members"
              className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2"
              style={{ transition: 'border-color 0.2s ease, background-color 0.2s ease' }}
            >
              Members
            </a>
            <a
              href="/dashboard"
              className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2"
              style={{ transition: 'border-color 0.2s ease, background-color 0.2s ease' }}
            >
              Dashboard
            </a>
          </div>
        </div>
      </div>

      <AdminClient
        items={(items ?? []) as Contenuto[]}
        resources={(resourcesData ?? []) as Resource[]}
        partners={(partnersData ?? []) as Partner[]}
      />
    </div>
  )
}
