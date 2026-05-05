import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import FeaturedReportsClient from './FeaturedReportsClient'
import type { FeaturedReport } from '@/lib/types'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function FeaturedReportsAdminPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') redirect('/dashboard')

  const { data } = await supabase
    .from('featured_reports')
    .select('id, title, description, image_url, pdf_url, authors, display_order, created_at')
    .order('display_order', { ascending: true })

  return (
    <div className="min-h-screen bg-paper-stone">
      {/* Top bar */}
      <div className="bg-forest text-white" style={{ animation: 'heroFadeIn 0.5s ease both' }}>
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both' }}>
            <h1 className="font-serif text-xl font-medium">Admin — Featured Reports</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3" style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both' }}>
            <a href="/admin" className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast">
              Content
            </a>
            <a href="/admin/team" className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast">
              Team
            </a>
            <a href="/admin/members" className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast">
              Members
            </a>
            <a href="/dashboard" className="border border-white/40 hover:border-white hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast">
              Dashboard
            </a>
          </div>
        </div>
      </div>

      <FeaturedReportsClient reports={(data ?? []) as FeaturedReport[]} />
    </div>
  )
}
