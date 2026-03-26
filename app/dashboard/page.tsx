import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'
import DashboardClient from './DashboardClient'
import type { Resource } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email!)
    .maybeSingle()

  const isAdmin = !!adminRow

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

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="bg-[#1a4a3a] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a href="/" className="font-serif font-bold text-white text-base leading-tight hover:text-white/80 transition-colors">
              Alata Investment Club
            </a>
            <span className="text-white/30">·</span>
            <span className="text-white/60 text-xs tracking-wide uppercase">Members Area</span>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <a
                href="/admin"
                className="border border-white/40 hover:border-white text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
              >
                Admin Panel
              </a>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>

      <DashboardClient displayName={displayName} resources={resources} />
    </div>
  )
}
