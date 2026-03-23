import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'
import ResourcesSection from './ResourcesSection'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', user.email!)
    .maybeSingle()

  const isAdmin = !!adminRow

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar */}
      <div className="bg-[#1a4a3a] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-xl font-medium text-white">Members Area</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-4">
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <ResourcesSection />
      </div>
    </div>
  )
}
