import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

const SUPERADMIN = 'finullistefano@gmail.com'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  foto_url: string | null
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

  const [{ data: items }, { data: adminUsers }] = await Promise.all([
    supabase
      .from('contenuti')
      .select('*')
      .in('tipo', ['evento', 'news'])
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('admin_users')
      .select('email')
      .order('email', { ascending: true }),
  ])

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="bg-[#1a4a3a] text-white">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl font-medium">Admin — News &amp; Events</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <a href="/" className="text-white/60 hover:text-white text-xs tracking-wide transition-colors">
            ← Homepage
          </a>
        </div>
      </div>

      <AdminClient
        items={(items ?? []) as Contenuto[]}
        adminUsers={(adminUsers ?? []).map(r => r.email as string)}
        superadmin={SUPERADMIN}
      />
    </div>
  )
}
