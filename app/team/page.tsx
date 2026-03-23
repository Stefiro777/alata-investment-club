import Image from 'next/image'

const row1 = [
  { nome: 'Filippo Lombardi',   ruolo: 'President',               fotoUrl: '/filippo-lombardi.jpeg' },
  { nome: 'Alessio Bianchetti', ruolo: 'Consultant',               fotoUrl: '/alessio-bianchetti.jpeg' },
]
const row2 = [
  { nome: 'Stefano Finulli',  ruolo: 'Head of Public Relations',   fotoUrl: '/stefano-finulli.jpeg' },
  { nome: 'Lorenzo Fioretti', ruolo: 'Co-Head of Events',          fotoUrl: '/lorenzo-fioretti.jpeg' },
  { nome: 'Alex Bonera',      ruolo: 'Co-Head of Events',          fotoUrl: '/alex-bonera.jpeg' },
]
const row3 = [
  { nome: 'Filippo Barnabò',   ruolo: 'Head of Media',             fotoUrl: '/filippo-barnabo.jpeg' },
  { nome: 'Antonio Di Miceli', ruolo: 'Head of Macro',             fotoUrl: '/antonio-dimiceli.jpeg' },
  { nome: 'Gabriele Sgotti',   ruolo: 'Head of Syrto',             fotoUrl: '/gabriele-sgotti.jpeg' },
]
const row4 = [
  { nome: 'Simone Moscatelli', ruolo: 'Co-Head of Equity Research', fotoUrl: '/simone-moscatelli.jpeg' },
  { nome: 'Cristian Ferrari',  ruolo: 'Co-Head of Equity Research', fotoUrl: '/cristian-ferrari.jpeg' },
  { nome: 'Edoardo Piceni',    ruolo: 'Head of Alumni',             fotoUrl: '/edoardo-piceni.jpeg' },
]

function initials(nome: string) {
  return nome.split(' ').map(n => n[0]).join('')
}

function MemberCard({ nome, ruolo, fotoUrl }: { nome: string; ruolo: string; fotoUrl?: string }) {
  return (
    <div className="bg-white overflow-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #1a4a3a' }}>
      {/* Photo */}
      <div className="relative h-48 md:h-96 overflow-hidden bg-[#f5f5f5]">
        {fotoUrl ? (
          <Image src={fotoUrl} alt={nome} fill className="object-cover object-top md:object-center" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-serif text-2xl text-[#1a4a3a]">{initials(nome)}</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-4 bg-[#1a4a3a] flex-grow">
        <h3 className="font-serif text-lg font-bold text-white">{nome}</h3>
        <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{ruolo}</p>
      </div>
    </div>
  )
}

export default function TeamPage() {
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
              <MemberCard nome={row1[0].nome} ruolo={row1[0].ruolo} fotoUrl={row1[0].fotoUrl} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row1[1].nome} ruolo={row1[1].ruolo} fotoUrl={row1[1].fotoUrl} />
              <MemberCard nome={row2[0].nome} ruolo={row2[0].ruolo} fotoUrl={row2[0].fotoUrl} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row2[1].nome} ruolo={row2[1].ruolo} fotoUrl={row2[1].fotoUrl} />
              <MemberCard nome={row2[2].nome} ruolo={row2[2].ruolo} fotoUrl={row2[2].fotoUrl} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row3[0].nome} ruolo={row3[0].ruolo} fotoUrl={row3[0].fotoUrl} />
              <MemberCard nome={row3[1].nome} ruolo={row3[1].ruolo} fotoUrl={row3[1].fotoUrl} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row3[2].nome} ruolo={row3[2].ruolo} fotoUrl={row3[2].fotoUrl} />
              <MemberCard nome={row4[0].nome} ruolo={row4[0].ruolo} fotoUrl={row4[0].fotoUrl} />
            </div>
            <div className="grid grid-cols-2 gap-6 items-stretch">
              <MemberCard nome={row4[1].nome} ruolo={row4[1].ruolo} fotoUrl={row4[1].fotoUrl} />
              <MemberCard nome={row4[2].nome} ruolo={row4[2].ruolo} fotoUrl={row4[2].fotoUrl} />
            </div>
          </div>

          {/* Desktop layout — hidden below md */}
          <div className="hidden md:block space-y-6">
            <div className="grid grid-cols-2 gap-6 max-w-xl mx-auto items-stretch">
              {row1.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} />)}
            </div>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {row2.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} />)}
            </div>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {row3.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} />)}
            </div>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {row4.map(m => <MemberCard key={m.nome} nome={m.nome} ruolo={m.ruolo} fotoUrl={m.fotoUrl} />)}
            </div>
          </div>

        </div>
      </section>
    </div>
  )
}
