import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Alumni = {
  id: string
  name: string
  role: string
  graduation_year: string | null
  linkedin_url: string | null
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="20" rx="3" fill="white"/>
      <path d="M5.5 8H7.5V14.5H5.5V8ZM6.5 7C5.84 7 5.5 6.56 5.5 6C5.5 5.44 5.85 5 6.51 5C7.17 5 7.5 5.44 7.5 6C7.5 6.56 7.16 7 6.5 7ZM14.5 14.5H12.5V11C12.5 10.17 12.19 9.62 11.47 9.62C10.92 9.62 10.6 10 10.44 10.36C10.38 10.51 10.37 10.72 10.37 10.93V14.5H8.37V8H10.37V8.89C10.66 8.43 11.18 7.78 12.37 7.78C13.85 7.78 14.5 8.78 14.5 10.35V14.5Z" fill="#1a4a3a"/>
    </svg>
  )
}

function AlumniCard({ alumni }: { alumni: Alumni }) {
  const initials = alumni.name.split(' ').map(n => n[0]).join('')
  return (
    <div
      className="bg-white overflow-hidden flex flex-col"
      style={{ border: '1px solid #1a4a3a' }}
    >
      {/* Initials area */}
      <div className="flex justify-center items-center py-6 bg-[#f5f5f5]">
        <div
          className="w-16 h-16 rounded-full bg-white flex items-center justify-center"
          style={{ border: '1px solid #1a4a3a' }}
        >
          <span className="font-serif text-xl font-bold text-[#1a4a3a]">{initials}</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 bg-[#1a4a3a] flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif text-base font-bold text-white leading-tight">{alumni.name}</h3>
            <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{alumni.role}</p>
            {alumni.graduation_year && (
              <p className="text-xs text-white/50 mt-1.5">Class of {alumni.graduation_year}</p>
            )}
          </div>
          {alumni.linkedin_url && (
            <a
              href={alumni.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 opacity-100 hover:opacity-70 transition-opacity mt-0.5"
              aria-label={`${alumni.name} on LinkedIn`}
            >
              <LinkedInIcon />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function AlumniPage() {
  const supabase = await createClient()

  const { data: showAlumniRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'show_alumni')
    .maybeSingle()

  if (!showAlumniRow || showAlumniRow.value !== 'true') {
    redirect('/team')
  }

  const { data: alumniList } = await supabase
    .from('alumni')
    .select('id, name, role, graduation_year, linkedin_url')
    .order('created_at', { ascending: false })

  const alumni = (alumniList ?? []) as Alumni[]

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] text-white flex items-center overflow-hidden">
        <Image
          src="/universita.jpg"
          alt=""
          fill
          className="object-cover grayscale"
          style={{ objectPosition: 'center 20%' }}
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">
              <Link href="/team" className="hover:text-white/80 transition-colors">
                Our Team
              </Link>
              {' / '}Alumni
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Alumni
            </h1>
            <div className="w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Former members who shaped Alata Investment Club — now building their careers in finance.
            </p>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {alumni.length === 0 ? (
            <p className="text-[#6b7280] text-sm text-center py-8">
              No alumni to display yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {alumni.map(a => (
                <AlumniCard key={a.id} alumni={a} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
