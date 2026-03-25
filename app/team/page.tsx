import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const row1 = [
  { nome: 'Filippo Lombardi',   ruolo: 'President',               fotoUrl: '/filippo-lombardi.jpeg',  linkedIn: 'https://www.linkedin.com/in/filippolombardiofficial/' },
  { nome: 'Alessio Bianchetti', ruolo: 'Consultant',               fotoUrl: '/alessio-bianchetti.jpeg', linkedIn: 'https://www.linkedin.com/in/alessio-bianchetti-673815213/' },
]
const row2 = [
  { nome: 'Stefano Finulli',  ruolo: 'Head of Public Relations',   fotoUrl: '/stefano-finulli.jpeg',  linkedIn: 'https://www.linkedin.com/in/sfinulli/' },
  { nome: 'Lorenzo Fioretti', ruolo: 'Co-Head of Events',          fotoUrl: '/lorenzo-fioretti.jpeg', linkedIn: 'https://www.linkedin.com/in/lorenzo-fioretti-a6726a258/' },
  { nome: 'Alex Bonera',      ruolo: 'Co-Head of Events',          fotoUrl: '/alex-bonera.jpeg',      linkedIn: 'https://www.linkedin.com/in/alex-bonera-102845268/' },
]
const row3 = [
  { nome: 'Filippo Barnabò',   ruolo: 'Head of Media',             fotoUrl: '/filippo-barnabo.jpeg',   linkedIn: 'https://www.linkedin.com/in/filippo-barnab%C3%B3/' },
  { nome: 'Antonio Di Miceli', ruolo: 'Head of Macro',             fotoUrl: '/antonio-dimiceli.jpeg',  linkedIn: 'https://www.linkedin.com/in/antoniodimiceli/' },
  { nome: 'Gabriele Sgotti',   ruolo: 'Head of Syrto',             fotoUrl: '/gabriele-sgotti.jpeg',   linkedIn: 'https://www.linkedin.com/in/gabriele-sgotti-49aaa2324/' },
]
const row4 = [
  { nome: 'Simone Moscatelli', ruolo: 'Co-Head of Equity Research', fotoUrl: '/simone-moscatelli.jpeg', linkedIn: 'https://www.linkedin.com/in/simone-moscatelli/' },
  { nome: 'Cristian Ferrari',  ruolo: 'Co-Head of Equity Research', fotoUrl: '/cristian-ferrari.jpeg',  linkedIn: 'https://www.linkedin.com/in/ferraricristian03/' },
  { nome: 'Edoardo Piceni',    ruolo: 'Head of Alumni',             fotoUrl: '/edoardo-piceni.jpeg',    linkedIn: 'https://www.linkedin.com/in/edoardo-antonio-piceni-89a132212/' },
]

function initials(nome: string) {
  return nome.split(' ').map(n => n[0]).join('')
}

function MemberCard({ nome, ruolo, fotoUrl, linkedIn }: { nome: string; ruolo: string; fotoUrl?: string; linkedIn?: string }) {
  return (
    <div className="bg-white overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #1a4a3a' }}>
      {/* Photo */}
      <div className="flex justify-center items-center py-5 bg-[#f5f5f5]">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-[#e0e0e0]">
          {fotoUrl ? (
            <Image src={fotoUrl} alt={nome} fill className="object-cover object-top" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-2xl text-[#1a4a3a]">{initials(nome)}</span>
            </div>
          )}
        </div>
      </div>
      {/* Info */}
      <div className="p-4 bg-[#1a4a3a] flex-grow">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-serif text-lg font-bold text-white">{nome}</h3>
          {linkedIn && (
            <a href={linkedIn} target="_blank" rel="noopener noreferrer" className="shrink-0 opacity-100 hover:opacity-70 transition-opacity">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="20" height="20" rx="3" fill="white"/>
                <path d="M5.5 8H7.5V14.5H5.5V8ZM6.5 7C5.84 7 5.5 6.56 5.5 6C5.5 5.44 5.85 5 6.51 5C7.17 5 7.5 5.44 7.5 6C7.5 6.56 7.16 7 6.5 7ZM14.5 14.5H12.5V11C12.5 10.17 12.19 9.62 11.47 9.62C10.92 9.62 10.6 10 10.44 10.36C10.38 10.51 10.37 10.72 10.37 10.93V14.5H8.37V8H10.37V8.89C10.66 8.43 11.18 7.78 12.37 7.78C13.85 7.78 14.5 8.78 14.5 10.35V14.5Z" fill="#1a4a3a"/>
              </svg>
            </a>
          )}
        </div>
        <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{ruolo}</p>
      </div>
    </div>
  )
}

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: showAlumniRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'show_alumni')
    .maybeSingle()

  const showAlumni = showAlumniRow?.value === 'true'

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] text-white flex items-center overflow-hidden">
        <Image src="/universita.jpg" alt="" fill className="object-cover grayscale" style={{ objectPosition: 'center 20%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Our Team</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Our Team
            </h1>
            <div className="w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Meet the Board of Directors driving Alata Investment Club — united by ambition and a genuine passion for finance.
            </p>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Mobile layout — hidden on md+ */}
          <div className="md:hidden space-y-6">
            <div className="grid grid-cols-1 gap-6 items-stretch">
              <MemberCard nome={row1[0].nome} ruolo={row1[0].ruolo} fotoUrl={row1[0].fotoUrl} linkedIn={row1[0].linkedIn} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row1[1].nome} ruolo={row1[1].ruolo} fotoUrl={row1[1].fotoUrl} linkedIn={row1[1].linkedIn} />
              <MemberCard nome={row2[0].nome} ruolo={row2[0].ruolo} fotoUrl={row2[0].fotoUrl} linkedIn={row2[0].linkedIn} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row2[1].nome} ruolo={row2[1].ruolo} fotoUrl={row2[1].fotoUrl} linkedIn={row2[1].linkedIn} />
              <MemberCard nome={row2[2].nome} ruolo={row2[2].ruolo} fotoUrl={row2[2].fotoUrl} linkedIn={row2[2].linkedIn} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row3[0].nome} ruolo={row3[0].ruolo} fotoUrl={row3[0].fotoUrl} linkedIn={row3[0].linkedIn} />
              <MemberCard nome={row3[1].nome} ruolo={row3[1].ruolo} fotoUrl={row3[1].fotoUrl} linkedIn={row3[1].linkedIn} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row3[2].nome} ruolo={row3[2].ruolo} fotoUrl={row3[2].fotoUrl} linkedIn={row3[2].linkedIn} />
              <MemberCard nome={row4[0].nome} ruolo={row4[0].ruolo} fotoUrl={row4[0].fotoUrl} linkedIn={row4[0].linkedIn} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row4[1].nome} ruolo={row4[1].ruolo} fotoUrl={row4[1].fotoUrl} linkedIn={row4[1].linkedIn} />
              <MemberCard nome={row4[2].nome} ruolo={row4[2].ruolo} fotoUrl={row4[2].fotoUrl} linkedIn={row4[2].linkedIn} />
            </div>
          </div>

          {/* Desktop layout — hidden below md */}
          <div className="hidden md:block space-y-6">
            <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto items-stretch">
              {row1.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} linkedIn={m.linkedIn} />)}
            </div>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {row2.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} linkedIn={m.linkedIn} />)}
            </div>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {row3.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} linkedIn={m.linkedIn} />)}
            </div>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {row4.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} linkedIn={m.linkedIn} />)}
            </div>
          </div>

        </div>
      </section>

      {/* Meet our Alumni — visible only if show_alumni is true */}
      {showAlumni && (
        <section className="py-20 bg-[#f5f5f5] border-t border-[#e5e5e5]">
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
