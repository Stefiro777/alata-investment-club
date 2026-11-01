'use client'

import { useState, useEffect } from 'react'
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
  bookable: boolean
}

/** Board C2: choose your mentor, then the booking scene (C3) opens. */
export default function MentorSection() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loaded, setLoaded] = useState(false)
  // The overlay lives here, not in the card, so a cart suggestion can switch it to another mentor.
  const [openMentorId, setOpenMentorId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/career/mentors?view=public')
      .then(r => r.json())
      .then(json => { setMentors((json.data ?? []) as Mentor[]); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  const openMentor = mentors.find(m => m.id === openMentorId) ?? null

  return (
    <section id="mentors" className="bg-ivory py-[clamp(72px,9vw,100px)] text-night">
      <div className="rd-gutter">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 className="rd-display text-[clamp(44px,5.4vw,64px)]">Choose your <em>mentor</em></h2>
          <div className="rd-italic text-[24px] text-club md:pb-2">Free for verified members</div>
        </div>

        {!loaded ? (
          <div className="mt-12 h-[420px]" aria-busy="true" />
        ) : mentors.length === 0 ? (
          <p className="rd-italic mt-12 text-[28px] text-earth-700">New mentors are joining soon.</p>
        ) : (
          <ul className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {mentors.map(m => (
              <li key={m.id} className="group flex max-w-[300px] flex-col sm:max-w-none">
                <div className="aspect-[250/290] overflow-hidden bg-moss">
                  {m.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo_url} alt={`Portrait of ${m.full_name}`} className="h-full w-full object-cover object-top grayscale transition-[filter] duration-500 group-hover:grayscale-0" loading="lazy" />
                  )}
                </div>
                <div className="rd-display mt-[18px] text-[30px] leading-[1.1]">{m.full_name}</div>
                {m.role_title && <div className="mt-1.5 text-[13px] font-medium text-club">{m.role_title}</div>}
                {m.bio_short && <p className="mt-2 text-[13px] leading-[1.55] text-earth-700">{m.bio_short}</p>}
                <button
                  type="button"
                  onClick={() => setOpenMentorId(m.id)}
                  className="rd-italic mt-4 self-start text-[26px] hover:underline underline-offset-[0.18em]"
                >
                  Book a session
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {openMentor && (
        <MentorBookingOverlay
          key={openMentor.id}
          mentor={openMentor}
          onClose={() => setOpenMentorId(null)}
          onSwitchMentor={setOpenMentorId}
        />
      )}
    </section>
  )
}
