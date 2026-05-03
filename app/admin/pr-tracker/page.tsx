import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AdminNavbar from '../components/AdminNavbar'

const TRACKER_URL =
  'https://docs.google.com/spreadsheets/d/1RMu7AWd3_CPUrq2XuXh1SEyYVxZxsIq3/edit?usp=sharing&ouid=111488797364027754658&rtpof=true&sd=true'

export default async function PrTrackerPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/dashboard')

  const { data: adminRow } = await supabase
    .from('admin_users').select('email').eq('email', user.email).maybeSingle()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (!adminRow && profile?.role !== 'bod' && profile?.role !== 'director') redirect('/dashboard')

  return (
    <>
      <AdminNavbar userEmail={user.email ?? ''} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-10">
          <div className="mb-8">
            <h2 className="font-serif text-2xl font-bold text-ink-900">Public Relations Tracker</h2>
            <div className="w-10 h-0.5 bg-forest mt-2" />
          </div>

          <div className="bg-white border border-line-faint px-8 py-10 flex flex-col items-start gap-4 max-w-lg">
            <a
              href={TRACKER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide uppercase px-6 py-3 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open Tracker
            </a>
            <p className="text-sm text-ink-500 leading-relaxed">
              Contacts, descriptions and notes for all PR relationships.
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
