'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent } from '@/lib/types'
import EventRegistrationModal from './EventRegistrationModal'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()).padStart(2, '0'),
  }
}

function StatusBadge({ status }: { status: UpcomingEvent['status'] }) {
  if (status === 'completed') {
    return (
      <span className="inline-block text-white/40 text-[10px] font-medium tracking-[0.2em] uppercase px-3 py-1">
        Completed
      </span>
    )
  }
  // coming_soon
  return (
    <span className="inline-block bg-forest text-white border border-white/20 text-[10px] font-medium tracking-[0.2em] uppercase px-3 py-1">
      Coming Soon
    </span>
  )
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalEvent, setModalEvent] = useState<UpcomingEvent | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('upcoming_events')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const today = new Date().toISOString().split('T')[0]
        const completed = data.filter(e => e.status === 'completed').slice(-3)
        const upcoming = data.filter(e => e.date >= today && e.status !== 'completed')
        setEvents([...completed, ...upcoming])
        setLoading(false)
      })
  }, [])

  if (loading || events.length === 0) return null

  return (
    <>
      <section className="bg-[#f5f5f0] py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">

          {/* Header */}
          <div className="mb-14">
            <p className="text-xs tracking-[0.3em] uppercase text-forest mb-4">Agenda</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-black">
              Upcoming Events
            </h2>
            <div className="w-10 h-px bg-forest mt-5" />
          </div>

          {/* Event rows */}
          <div>
            {events.map((event, i) => {
              const { month, day } = formatDate(event.date)
              const isLast = i === events.length - 1
              return (
                <div key={event.id}>
                  <div className="group flex flex-col sm:flex-row sm:items-center gap-6 py-8 bg-forest hover:bg-[#153d30] transition-colors duration-fast px-6">

                    {/* Date block */}
                    <div className="flex-shrink-0 w-16 sm:w-20">
                      <p className="text-[10px] tracking-[0.25em] uppercase text-white font-medium leading-none mb-1">
                        {month}
                      </p>
                      <p className="font-serif text-5xl font-bold text-white leading-none">
                        {day}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif text-xl text-white font-bold leading-snug">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="text-white/70 text-sm mt-1.5 leading-relaxed max-w-xl" style={{ whiteSpace: 'pre-wrap' }}>
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div className="flex-shrink-0 flex items-center">
                      {event.status === 'open' ? (
                        event.action_type === 'link' && event.action_link ? (
                          <a
                            href={event.action_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white hover:bg-gray-100 text-forest text-sm font-medium tracking-widest uppercase px-5 py-2 transition-colors duration-fast cursor-pointer"
                          >
                            Open
                          </a>
                        ) : event.action_type === 'form' ? (
                          <button
                            onClick={() => setModalEvent(event)}
                            className="bg-white hover:bg-gray-100 text-forest text-sm font-medium tracking-widest uppercase px-5 py-2 transition-colors duration-fast cursor-pointer"
                          >
                            Open
                          </button>
                        ) : (
                          <span className="bg-white text-forest text-sm font-medium tracking-widest uppercase px-5 py-2">
                            Open
                          </span>
                        )
                      ) : (
                        <StatusBadge status={event.status} />
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  {!isLast && (
                    <div className="h-px bg-white/10" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Registration modal */}
      {modalEvent && (
        <EventRegistrationModal
          event={{ id: modalEvent.id, title: modalEvent.title, date: modalEvent.date }}
          onClose={() => setModalEvent(null)}
        />
      )}
    </>
  )
}
