'use client'

import { useState, useEffect } from 'react'
import Reveal from '../components/Reveal'
import { createClient } from '@/lib/supabase'
import MentorBookingOverlay from './MentorBookingOverlay'
import { type ServiceInfo } from './PaymentForm'
import { MONTHS, WEEKDAYS, daysInMonth, firstDayOffset, toDateStr } from './calendarUtils'

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

type Slot = { date: string; time: string; available: boolean }

function MentorCard({ mentor }: { mentor: Mentor }) {
  const [expanded, setExpanded] = useState(false)
  const [service, setService]   = useState<ServiceInfo | null>(null)
  const [loadingService, setLoadingService] = useState(false)

  const today      = new Date()
  const todayStr   = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [slots, setSlots]               = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [overlayOpen, setOverlayOpen]   = useState(false)

  useEffect(() => {
    if (!expanded || service || !mentor.service_id) return
    setLoadingService(true)
    createClient()
      .from('career_services')
      .select('id, name, price_cents, duration_minutes')
      .eq('id', mentor.service_id)
      .single()
      .then(({ data }) => { setService((data as ServiceInfo) ?? null); setLoadingService(false) })
  }, [expanded, service, mentor.service_id])

  useEffect(() => {
    if (!expanded || !mentor.service_id) return
    setLoadingSlots(true)
    setSelectedDate(null)
    setSelectedTime(null)
    fetch(`/api/career/slots?service_id=${mentor.service_id}&mentor_id=${mentor.id}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => { setSlots(data.slots ?? []); setLoadingSlots(false) })
      .catch(() => setLoadingSlots(false))
  }, [expanded, mentor.service_id, mentor.id, year, month])

  const offset      = firstDayOffset(year, month)
  const totalDays   = daysInMonth(year, month)
  const availDates  = new Set(slots.filter(s => s.available).map(s => s.date))
  const timesForDay = selectedDate ? slots.filter(s => s.date === selectedDate && s.available) : []
  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth() + 1

  function prevMonth() {
    if (isPrevDisabled) return
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  return (
    <div className="bg-white border border-line-faint">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-5 p-6 text-left"
      >
        {mentor.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mentor.photo_url} alt={mentor.full_name}
            className="w-16 h-16 rounded-full object-cover object-top flex-shrink-0 border border-line" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-forest/10 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-semibold text-ink-900">{mentor.full_name}</h3>
          {mentor.role_title && <p className="text-xs text-forest uppercase tracking-wide mt-0.5">{mentor.role_title}</p>}
          {mentor.bio_short && <p className="text-sm text-ink-500 mt-2 leading-relaxed">{mentor.bio_short}</p>}
        </div>
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-line-faint px-6 py-6">
          {mentor.bio_long && (
            <p className="text-sm text-ink-500 leading-relaxed mb-6">{mentor.bio_long}</p>
          )}

          {!mentor.service_id ? (
            <p className="text-sm text-gray-400">Not yet available for online booking.</p>
          ) : (
            <>
              {/* Month navigator */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} disabled={isPrevDisabled}
                  className="-m-3 p-3 text-gray-400 hover:text-forest transition-colors disabled:opacity-25">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-semibold uppercase tracking-widest text-gray-900">
                  {MONTHS[month - 1]} {year}
                </span>
                <button onClick={nextMonth} className="-m-3 p-3 text-gray-400 hover:text-forest transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 -mx-3 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {loadingSlots ? (
                <div className="h-44 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Loading availability…</p>
                </div>
              ) : (
                <div className="grid grid-cols-7 -mx-3">
                  {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const day     = i + 1
                    const dateStr = toDateStr(year, month, day)
                    const isPast  = dateStr < todayStr
                    const hasSlot = availDates.has(dateStr)
                    const isSel   = selectedDate === dateStr
                    return (
                      <div key={day} className="flex flex-col items-center py-1 relative">
                        <button
                          type="button"
                          disabled={isPast || !hasSlot}
                          onClick={() => { setSelectedDate(dateStr); setSelectedTime(null) }}
                          className="w-full max-w-11 aspect-square mx-auto text-sm transition-colors"
                          style={{
                            background: isSel ? '#1a4a3a' : 'transparent',
                            color: isSel ? '#fff' : isPast || !hasSlot ? '#d1d5db' : '#111827',
                            cursor: isPast || !hasSlot ? 'default' : 'pointer',
                          }}
                        >
                          {day}
                        </button>
                        {hasSlot && !isPast && (
                          <span className="absolute bottom-0 w-1 h-1 rounded-full"
                            style={{ background: isSel ? '#fff' : 'var(--forest)' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {selectedDate && !loadingSlots && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  {timesForDay.length === 0 ? (
                    <p className="text-sm text-gray-400">No available times for this date.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {timesForDay.map(s => (
                        <button
                          key={s.time}
                          type="button"
                          onClick={() => setSelectedTime(s.time)}
                          className="px-4 py-2 text-sm font-medium border transition-colors"
                          style={{
                            background: selectedTime === s.time ? '#1a4a3a' : '#fff',
                            color: selectedTime === s.time ? '#fff' : '#374151',
                            borderColor: selectedTime === s.time ? '#1a4a3a' : '#e5e7eb',
                          }}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setOverlayOpen(true)}
                disabled={!selectedDate || !selectedTime || loadingService || !service}
                className="mt-6 w-full bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors disabled:opacity-40"
              >
                {loadingService ? 'Loading…' : 'Book a Session'}
              </button>
            </>
          )}
        </div>
      )}

      {overlayOpen && service && selectedDate && selectedTime && (
        <MentorBookingOverlay
          mentor={{ id: mentor.id, full_name: mentor.full_name }}
          service={service}
          slot={{ date: selectedDate, time: selectedTime }}
          onClose={() => setOverlayOpen(false)}
        />
      )}
    </div>
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

  return (
    <section className="py-20 sm:py-28 bg-white border-t border-line">
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="mb-14 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">One-on-one</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">Meet Our Mentors</h2>
            <p className="text-ink-500 text-sm leading-relaxed max-w-xl mx-auto">
              Book a session directly with one of our mentors — click to learn more and see their availability.
            </p>
          </div>
        </Reveal>
        <div className="flex flex-col gap-4">
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
