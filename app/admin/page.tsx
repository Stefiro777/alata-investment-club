import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

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

  const { data: items } = await supabase
    .from('contenuti')
    .select('*')
    .in('tipo', ['evento', 'news', 'aggiornamento'])
    .order('data_pubblicazione', { ascending: false })

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="bg-[#1a4a3a] text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-medium">Admin — Content Management</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center justify-between gap-8 flex-1 ml-8">
            <a
              href="/dashboard"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Back to Dashboard
            </a>
            <a
              href="/admin/members"
              className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
            >
              Members Management
            </a>
          </div>
        </div>
      </div>

      <AdminClient
        items={(items ?? []) as Contenuto[]}
      />
    </div>
  )
}
