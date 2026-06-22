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

const BADGE_CLASS = "inline-block bg-forest text-white border border-white/20 text-[10px] font-medium tracking-[0.2em] uppercase px-3 py-1"

function StatusBadge({ status }: { status: UpcomingEvent['status'] }) {
  if (status === 'completed') {
    return <span className={BADGE_CLASS}>Completed</span>
  }
  return <span className={BADGE_CLASS}>Coming Soon</span>
}

function UpcomingEventRow({
  event,
  isLast,
  onOpenModal,
}: {
  event: UpcomingEvent
  isLast: boolean
  onOpenModal: (event: UpcomingEvent) => void
}) {
  const [open, setOpen] = useState(false)
  const { month, day } = formatDate(event.date)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 py-8 bg-forest hover:bg-[#153d30] transition-colors duration-fast px-6">

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
            <button
              onClick={() => setOpen(v => !v)}
              className="mt-2 text-[10px] font-medium tracking-widest uppercase text-white/50 hover:text-white/80 transition-colors"
            >
              {open ? 'READ LESS' : 'READ MORE'}
            </button>
          )}

          {/* Collapsible description */}
          <div className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-96' : 'max-h-0'}`}>
            {event.description && (
              <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-xl" style={{ whiteSpace: 'pre-wrap' }}>
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Action — always visible */}
        <div className="flex-shrink-0 flex items-start pt-1">
          {event.status === 'open' ? (
            event.action_type === 'link' && event.action_link ? (
              <a
                href={event.action_link}
                target="_blank"
                rel="noopener noreferrer"
                className={BADGE_CLASS}
              >
                Open
              </a>
            ) : event.action_type === 'form' ? (
              <button onClick={() => onOpenModal(event)} className={BADGE_CLASS}>
                Open
              </button>
            ) : (
              <span className={BADGE_CLASS}>Open</span>
            )
          ) : (
            <StatusBadge status={event.status} />
          )}
        </div>
      </div>

      {!isLast && <div className="h-px bg-white/10" />}
    </div>
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
      .gte('date', new Date().toISOString().split('T')[0])
      .order('display_order', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        setEvents(data)
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
            {events.map((event, i) => (
              <UpcomingEventRow
                key={event.id}
                event={event}
                isLast={i === events.length - 1}
                onOpenModal={setModalEvent}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Registration modal */}
      {modalEvent && (
        <EventRegistrationModal
          event={{ id: modalEvent.id, title: modalEvent.title, date: modalEvent.date, registration_field: modalEvent.registration_field }}
          onClose={() => setModalEvent(null)}
        />
      )}
    </>
  )
}
