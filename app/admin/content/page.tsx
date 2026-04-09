import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'
import NewsEventsSection from '../components/NewsEventsSection'
import FeaturedReportsClient from '../featured-reports/FeaturedReportsClient'
import type { FeaturedReport } from '@/lib/types'

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

export default async function AdminContentPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: adminRow } = await supabase
    .from('admin_users').select('email').eq('email', user.email).maybeSingle()
  if (!adminRow) redirect('/dashboard')

  const [
    { data: contenuti },
    { data: featuredReportsData },
  ] = await Promise.all([
    supabase
      .from('contenuti')
      .select('*')
      .in('tipo', ['evento', 'news', 'aggiornamento'])
      .order('data_pubblicazione', { ascending: false }),
    supabase
      .from('featured_reports')
      .select('id, title, description, pdf_url, authors, display_order')
      .order('display_order', { ascending: true }),
  ])

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <NewsEventsSection initialItems={(contenuti ?? []) as Contenuto[]} />
        </div>
        <div className="border-t border-black/10" />
        <FeaturedReportsClient reports={(featuredReportsData ?? []) as FeaturedReport[]} />
      </main>
    </>
  )
}
