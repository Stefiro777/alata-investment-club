import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'

type Member = {
  id: number
  nome: string
  ruolo: string
  bio: string | null
  foto_url: string | null
  linkedin_url: string | null
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="group flex flex-col">
      {/* Photo */}
      <div className="relative w-full aspect-[3/4] bg-[#f5f5f5] overflow-hidden mb-5 border border-black/10 rounded-sm">
        {member.foto_url ? (
          <Image
            src={member.foto_url}
            alt={member.nome}
            fill
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#eaeaea]">
            <span className="font-serif text-6xl font-light text-[#1a4a3a]/25">
              {member.nome.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-xl font-medium text-[#0a0a0a]">{member.nome}</h3>
        <p className="text-xs tracking-widest uppercase text-[#1a4a3a] font-medium">{member.ruolo}</p>
        {member.bio && (
          <p className="text-[#6b7280] text-sm leading-relaxed mt-2">{member.bio}</p>
        )}
        {member.linkedin_url && (
          <a
            href={member.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[#0a0a0a] hover:text-[#1a4a3a] text-xs font-medium tracking-wide mt-3 transition-colors"
          >
            <LinkedInIcon />
            LinkedIn Profile
          </a>
        )}
      </div>
    </div>
  )
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: members } = await supabase
    .from('team')
    .select('*')
    .order('id', { ascending: true })

  return (
    <div>
      {/* Header — dark */}
      <section className="bg-[#1a4a3a] text-white py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">People</p>
          <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
            Our Team
          </h1>
          <div className="w-12 h-px bg-white/30 mb-6" />
          <p className="text-white/70 text-base max-w-2xl leading-relaxed">
            Meet the board members who lead Alata Investment Club, united by a shared passion for financial markets and professional development.
          </p>
        </div>
      </section>

      {/* Grid — white */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {!members || members.length === 0 ? (
            <div className="py-20 text-center text-[#6b7280]">
              <p className="text-sm tracking-wide">No team members available at the moment.</p>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
