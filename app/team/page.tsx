import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type TeamMember = {
  id: string
  name: string
  role: string
  photo_url: string | null
  linkedin_url: string | null
  type: string
  order_index: number | null
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('')
}

function MemberCard({ member }: { member: TeamMember }) {
  return (
    <div className="bg-white overflow-hidden flex flex-col" style={{ border: '1px solid #1a4a3a' }}>
      {/* Photo */}
      <div className="flex justify-center items-center py-5 bg-[#f5f5f5]">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#e0e0e0]">
          {member.photo_url ? (
            <Image src={member.photo_url} alt={member.name} fill className="object-cover object-top" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-2xl text-[#1a4a3a]">{initials(member.name)}</span>
            </div>
          )}
        </div>
      </div>
      {/* Info */}
      <div className="p-4 bg-[#1a4a3a] flex-grow">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-bold text-white">{member.name}</h3>
          {member.linkedin_url && (
            <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-100 hover:opacity-70 transition-opacity">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" rx="3" fill="white"/>
                <path d="M5.5 8H7.5V14.5H5.5V8ZM6.5 7C5.84 7 5.5 6.56 5.5 6C5.5 5.44 5.85 5 6.51 5C7.17 5 7.5 5.44 7.5 6C7.5 6.56 7.16 7 6.5 7ZM14.5 14.5H12.5V11C12.5 10.17 12.19 9.62 11.47 9.62C10.92 9.62 10.6 10 10.44 10.36C10.38 10.51 10.37 10.72 10.37 10.93V14.5H8.37V8H10.37V8.89C10.66 8.43 11.18 7.78 12.37 7.78C13.85 7.78 14.5 8.78 14.5 10.35V14.5Z" fill="#1a4a3a"/>
              </svg>
            </a>
          )}
        </div>
        <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{member.role}</p>
      </div>
    </div>
  )
}

export default async function TeamPage() {
  const supabase = await createClient()

  const [{ data: showAlumniRow }, { data: membersData }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'show_alumni').maybeSingle(),
    supabase
      .from('team_members')
      .select('id, name, role, photo_url, linkedin_url, type, order_index')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])

  const showAlumni = showAlumniRow?.value === 'true'
  const members = (membersData ?? []) as TeamMember[]
  const bod = members.filter(m => m.type === 'bod')
  const management = members.filter(m => m.type === 'management')

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Image src="/universita.jpg" alt="" fill className="object-cover grayscale" style={{ objectPosition: 'center 20%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Our Team</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">Our Team</h1>
            <div className="w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Meet the Board of Directors and Management driving Alata Investment Club — united by ambition and a genuine passion for finance.
            </p>
          </div>
        </div>
      </section>

      {/* Board of Directors */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a] mb-10">Board of Directors</h2>
          {bod.length === 0 ? (
            <p className="text-[#6b7280] text-sm">No members to display.</p>
          ) : (
            <div className="space-y-6">
              {/* First row: first 2 members centered */}
              <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto">
                {bod.slice(0, 2).map(m => <MemberCard key={m.id} member={m} />)}
              </div>
              {/* Remaining members in 3-column rows — same card width as above */}
              {bod.length > 2 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-[54.75rem] mx-auto">
                  {bod.slice(2).map(m => <MemberCard key={m.id} member={m} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Management */}
      <section className="py-20 sm:py-28 bg-[#f5f5f5] border-t border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a] mb-10">Management</h2>
          {management.length === 0 ? (
            <p className="text-[#6b7280] text-sm">No members to display.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-[54.75rem] mx-auto">
              {management.map(m => <MemberCard key={m.id} member={m} />)}
            </div>
          )}
        </div>
      </section>

      {/* Meet our Alumni */}
      {showAlumni && (
        <section className="py-20 bg-white border-t border-[#e5e5e5]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">Past Members</p>
              <h2 className="font-serif text-3xl font-bold text-[#0a0a0a] mb-3">Meet our Alumni</h2>
              <div className="w-10 h-px bg-[#1a4a3a]" />
              <p className="text-[#6b7280] text-sm leading-relaxed mt-4 max-w-lg">
                Discover the former members who helped build Alata Investment Club and are now making an impact across the financial industry.
              </p>
            </div>
            <Link
              href="/team/alumni"
              className="inline-flex items-center gap-3 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-sm font-medium tracking-wide px-10 py-4 transition-colors duration-150 whitespace-nowrap"
            >
              View Alumni
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
