'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Reveal from '../components/Reveal'
import MentorBookingOverlay from './MentorBookingOverlay'

type Mentor = {
  id: string
  slug: string
  full_name: string
  role_title: string | null
  photo_url: string | null
  bio_short: string | null
  bio_long: string | null
  display_order: number
  service_id: string | null
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('')
}

function MentorCard({ mentor }: { mentor: Mentor }) {
  const [overlayOpen, setOverlayOpen] = useState(false)

  return (
    <>
      <div className="group bg-white overflow-hidden flex flex-col h-full" style={{ border: '1px solid var(--forest)' }}>
        {/* Portrait — full-bleed, sharp corners, same treatment as /team */}
        <div className="relative aspect-[4/5] overflow-hidden bg-paper-stone">
          {mentor.photo_url ? (
            <Image
              src={mentor.photo_url}
              alt={mentor.full_name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover object-top transition-transform duration-slow group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-serif text-4xl text-forest/60">{initials(mentor.full_name)}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-forest/0 group-hover:bg-forest/10 transition-colors duration-base pointer-events-none" />
        </div>

        {/* Info — name, role and bio_short all visible without interaction */}
        <div className="relative p-4 bg-forest flex flex-col flex-1">
          <div className="absolute top-0 left-0 h-px bg-white/40 w-0 group-hover:w-full transition-[width] duration-slow" />
          <h3 className="font-serif text-lg font-bold text-white leading-tight">{mentor.full_name}</h3>
          {mentor.role_title && (
            <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{mentor.role_title}</p>
          )}
          {mentor.bio_short && (
            <p className="text-sm text-white/80 leading-relaxed mt-3 flex-1">{mentor.bio_short}</p>
          )}
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            className="mt-5 inline-flex items-center justify-center gap-2 border border-white/40 text-white text-xs font-semibold uppercase tracking-widest py-3 hover:bg-white hover:text-forest hover:border-white transition-colors duration-base"
          >
            View Availability
          </button>
        </div>
      </div>

      {overlayOpen && (
        <MentorBookingOverlay mentor={mentor} onClose={() => setOverlayOpen(false)} />
      )}
    </>
  )
}

export default function MentorSection() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loaded, setLoaded]   = useState(false)

  useEffect(() => {
    fetch('/api/career/mentors')
      .then(r => r.json())
      .then(json => { setMentors((json.data ?? []) as Mentor[]); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || mentors.length === 0) return null

  // Same per-card width as MemberCard in /team (~276px: 54.75rem over 3
  // columns with gap-6) at every mentor count, so cards match its scale
  // instead of stretching to fill max-w-6xl.
  const gridClass = mentors.length === 1
    ? 'grid-cols-1 max-w-[17.25rem]'
    : mentors.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-xl'
      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 max-w-[54.75rem]'

  return (
    <section className="py-20 sm:py-28 bg-white border-t border-line">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="mb-14 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">One-on-one</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">Meet Our Mentors</h2>
            <p className="text-ink-500 text-sm leading-relaxed max-w-xl mx-auto">
              Book a session directly with one of our mentors — view their profile and check availability.
            </p>
          </div>
        </Reveal>
        <div className={`grid ${gridClass} gap-6 mx-auto`}>
          {mentors.map((m, i) => (
            <Reveal key={m.id} delay={i * 80} direction="up">
              <MentorCard mentor={m} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
