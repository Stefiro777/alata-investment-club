import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import LogoutButton from './LogoutButton'

type Materiale = {
  id: number
  titolo: string
  descrizione: string | null
  categoria: string | null
  file_url: string
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: materiali } = await supabase
    .from('materiali')
    .select('*')
    .order('id', { ascending: false })

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Top bar — dark */}
      <div className="bg-[#1a4a3a] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-xl font-medium text-white">Members Area</h1>
            <p className="text-white/50 text-xs mt-0.5">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-3">Exclusive access</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a]">Materials</h2>
          <div className="w-10 h-px bg-[#1a4a3a] mt-4" />
        </div>

        {!materiali || materiali.length === 0 ? (
          <div className="py-24 text-center text-[#6b7280]">
            <p className="text-sm tracking-wide">No materials available at the moment.</p>
            <p className="text-xs mt-2">Check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-px bg-[#e5e5e5] sm:grid-cols-2 lg:grid-cols-3">
            {materiali.map((mat: Materiale) => (
              <div key={mat.id} className="bg-white p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-9 h-9 bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-[#1a4a3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {mat.categoria && (
                    <span className="text-xs tracking-widest uppercase text-[#6b7280] font-medium">
                      {mat.categoria}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-serif text-lg font-medium text-[#0a0a0a] leading-snug">{mat.titolo}</h3>
                  {mat.descrizione && (
                    <p className="text-[#6b7280] text-sm mt-1.5 leading-relaxed">{mat.descrizione}</p>
                  )}
                </div>

                <a
                  href={mat.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#1a4a3a] hover:text-[#0a0a0a] text-xs font-medium tracking-wide uppercase transition-colors border-t border-[#f5f5f5] pt-4 mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
