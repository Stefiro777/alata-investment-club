import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import Link from 'next/link'
import StatsSection from './components/StatsSection'
import NewsCard, { type NewsItem } from './components/NewsCard'
import PartnersMarquee from './components/PartnersMarquee'

export const dynamic = 'force-dynamic'

function InstagramIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: eventi } = await supabase
    .from('contenuti')
    .select('id, titolo, descrizione, short_description, full_description, immagine_url, photos, tag, tipo, data_pubblicazione, link')
    .in('tipo', ['evento', 'aggiornamento', 'news'])
    .order('data_pubblicazione', { ascending: false })
    .limit(3)

  return (
    <div>
      {/* Hero — background image + overlay */}
      <section className="text-white" className="relative overflow-hidden min-h-[600px] lg:min-h-[710px]" style={{ position: 'relative' }}>
        {/* Background photo */}
        <Image
          src="/loggia.jpg"
          fill
          alt="Loggia"
          style={{ objectFit: 'cover', filter: 'grayscale(100%)', zIndex: 0 }}
          priority
        />
        {/* Green overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26, 74, 58, 0.72)', zIndex: 1 }} />
        {/* Content */}
        <div className="py-24 sm:py-36" style={{ position: 'relative', zIndex: 2 }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-16 text-center lg:text-left">
              {/* Right (DOM first → desktop right via row-reverse) — text */}
              <div className="flex-1 min-w-0">
                <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl font-semibold text-white leading-[1.05] mb-8">
                  Alata<br />
                  <em className="italic font-semibold">Investment Club</em>
                </h1>
                <div className="w-16 h-px bg-white/30" />
              </div>

              {/* Left — logo with frame */}
              <div className="flex-shrink-0 flex justify-center mx-auto md:mx-0">
                <div style={{ background: 'white', boxShadow: '0 8px 48px rgba(0,0,0,0.5)', border: '1px solid #1a4a3a', outline: '3px solid #1a4a3a', outlineOffset: '-7px' }}>
                  <Image
                    src="/logofronte.png"
                    alt="Alata Investment Club"
                    width={320}
                    height={320}
                    className="object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Description — white band */}
      <section className="bg-white py-16 sm:py-20 border-b border-[#e5e5e5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a] mb-6">Who We Are</h2>
          <p className="text-[#6b7280] text-base sm:text-lg leading-relaxed max-w-3xl">
            Alata Investment Club is a university association of the University of Brescia, founded with the goal of promoting financial culture through a stimulating, meritocratic and collaborative environment. Our mission is twofold: on one hand, to encourage the personal and professional growth of the most motivated students; on the other, to develop concrete skills in key areas of finance, including financial statement analysis, equity research, M&amp;A transactions, and macroeconomic analysis. Within the association, members work in teams to produce reports, thematic insights, and market analyses, simulating professional dynamics and building skills valuable in the workplace.
          </p>
        </div>
      </section>

      <StatsSection />

      {/* About — Vision + Mission */}
      <div className="bg-white grid md:grid-cols-2 divide-y md:divide-y-0">
        <div className="px-8 lg:px-14 py-20 sm:py-24">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#0a0a0a] leading-[1.08] mb-3">
            Our Vision
          </h2>
          <div className="w-10 h-0.5 bg-[#1a4a3a] mb-5" />
          <p className="text-[#6b7280] text-base sm:text-lg leading-relaxed">
            A community where ambition meets opportunity, regardless of where you start.
          </p>
        </div>
        <div className="px-8 lg:px-14 py-20 sm:py-24 relative before:hidden md:before:block before:absolute before:left-0 before:top-10 before:bottom-10 before:w-px before:bg-black/10">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#0a0a0a] leading-[1.08] mb-3">
            Our Mission
          </h2>
          <div className="w-10 h-0.5 bg-[#1a4a3a] mb-5" />
          <p className="text-[#6b7280] text-base sm:text-lg leading-relaxed">
            Alata was born from a simple idea: that the best conversations about finance happen between people who are genuinely curious. We bring together the most ambitious students at UniBS to share knowledge, challenge each other, and grow, inside and outside the classroom.
          </p>
        </div>
      </div>

      {/* About — What We Value */}
      <section className="bg-[#f5f5f5] pt-10 sm:pt-12 pb-10 sm:pb-12">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#0a0a0a] leading-[1.08] mb-3">
            What We Value
          </h2>
          <div className="w-10 h-0.5 bg-[#1a4a3a] mb-10" />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Community', body: 'More than a club, a network built on trust. The relationships you build here last well beyond your degree.' },
              { label: 'Drive', body: "We attract people who don't wait to be told what to do. Taking initiative isn't a buzzword here, it's the entry requirement." },
              { label: 'Ambition', body: "We think big about what a university club can be. And we're building accordingly." },
            ].map(({ label, body }) => (
              <div key={label} className="bg-[#1a4a3a] p-8">
                <h3 className="font-serif text-2xl font-bold text-white mb-3">{label}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News & Events */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-12 border-b border-[#e5e5e5] pb-6 flex items-end justify-between gap-6">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-2">Latest</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a]">News &amp; Events</h2>
            </div>
            <Link
              href="/events"
              className="shrink-0 inline-flex items-center gap-2 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-semibold tracking-wide uppercase px-6 py-2.5 transition-colors duration-150"
            >
              See all events
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {!eventi || eventi.length === 0 ? (
            <div className="py-20 text-center text-[#6b7280]">
              <p className="text-sm tracking-wide">No events or updates available at the moment.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {eventi.map((item) => (
                <NewsCard key={item.id} item={item as NewsItem} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Our Partners */}
      <PartnersMarquee />

      {/* Contact Us */}
      <section className="py-20 sm:py-28 bg-[#1a4a3a] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Get in touch</p>
              <h2 className="font-serif text-4xl sm:text-5xl font-bold leading-tight mb-6">
                Contact Us
              </h2>
              <div className="w-12 h-px bg-white/30 mb-6" />
              <p className="text-white/70 text-sm leading-relaxed">
                Interested in joining, partnering, or simply learning more about what we do? Reach out through any of the channels below.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <a
                href="https://www.instagram.com/alata_investmentclub"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 border border-white/20 flex items-center justify-center group-hover:border-white/60 transition-colors flex-shrink-0">
                  <InstagramIcon />
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase text-white/50 mb-0.5">Instagram</p>
                  <p className="text-white text-sm font-medium group-hover:text-white/70 transition-colors">
                    @alata_investmentclub
                  </p>
                </div>
              </a>

              <a
                href="https://www.linkedin.com/company/alatainvestmentclub/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 border border-white/20 flex items-center justify-center group-hover:border-white/60 transition-colors flex-shrink-0">
                  <LinkedInIcon />
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase text-white/50 mb-0.5">LinkedIn</p>
                  <p className="text-white text-sm font-medium group-hover:text-white/70 transition-colors">
                    Alata Investment Club
                  </p>
                </div>
              </a>

              <a
                href="mailto:Alatabrixiaic@gmail.com"
                className="flex items-center gap-4 group"
              >
                <div className="w-12 h-12 border border-white/20 flex items-center justify-center group-hover:border-white/60 transition-colors flex-shrink-0">
                  <MailIcon />
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase text-white/50 mb-0.5">Email</p>
                  <p className="text-white text-sm font-medium group-hover:text-white/70 transition-colors">
                    Alatabrixiaic@gmail.com
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
