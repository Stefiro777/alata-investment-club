'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent } from '@/lib/types'
import EventRegistrationModal from './EventRegistrationModal'
import { useCart } from '@/app/components/CartContext'

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d.getDate()).padStart(2, '0'),
  }
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

const BADGE_CLASS = "inline-block bg-forest text-white border border-white/20 text-[10px] font-medium tracking-[0.2em] uppercase px-3 py-1"

// Reads ?register= and auto-opens the modal. Must be wrapped in <Suspense>.
function RegisterDeepLink({
  events,
  onOpen,
}: {
  events: UpcomingEvent[]
  onOpen: (ev: UpcomingEvent) => void
}) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const registerId = searchParams.get('register')
    if (!registerId || events.length === 0) return
    const target = events.find(
      ev => ev.id === registerId && ev.status === 'open' && ev.action_type === 'form'
    )
    if (target) onOpen(target)
  }, [searchParams, events, onOpen])
  return null
}

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
  const [added, setAdded] = useState(false)
  const { month, day } = formatDate(event.date)
  const { addItem } = useCart()
  const hasTicket    = event.status === 'open' && event.ticket_price_cents !== null && event.ticket_price_cents !== undefined
  const isPaidTicket = hasTicket && (event.ticket_price_cents ?? 0) > 0
  const isFreeTicket = hasTicket && event.ticket_price_cents === 0

  function handleAddTicket() {
    console.log('addItem called with:', { type: 'ticket', priceCents: event.ticket_price_cents, eventId: event.id })
    addItem({
      type:          'ticket',
      cartKey:       `ticket:${event.id}`,
      name:          event.title,
      priceCents:    event.ticket_price_cents ?? 0,
      eventId:       event.id,
      eventDate:     event.date,
      eventLocation: event.location ?? null,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

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
          <div className={`overflow-hidden transition-all duration-fast ${open ? 'max-h-96' : 'max-h-0'}`}>
            {event.description && (
              <p className="text-white/70 text-sm mt-2 leading-relaxed max-w-xl" style={{ whiteSpace: 'pre-wrap' }}>
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Action — always visible */}
        <div className="flex-shrink-0 flex items-start pt-1 gap-2 flex-col sm:flex-row">
          {(isPaidTicket || isFreeTicket) ? (
            <button
              onClick={handleAddTicket}
              className={`inline-block border text-[10px] font-medium tracking-[0.2em] uppercase px-3 py-1 transition-colors ${
                added
                  ? 'border-forest bg-forest text-white'
                  : 'border-forest bg-forest text-white hover:bg-[#143d30]'
              }`}
            >
              {added
                ? 'Added ✓'
                : isFreeTicket
                  ? 'Add ticket — Free'
                  : `Add ticket — ${fmtEur(event.ticket_price_cents ?? 0)}`}
            </button>
          ) : event.status === 'open' ? (
            event.action_type === 'link' && event.action_link ? (
              <a href={event.action_link} target="_blank" rel="noopener noreferrer" className={BADGE_CLASS}>
                Register Now
              </a>
            ) : event.action_type === 'form' ? (
              <button onClick={() => onOpenModal(event)} className={BADGE_CLASS}>
                Register Now
              </button>
            ) : (
              <span className={BADGE_CLASS}>Register Now</span>
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
  const openModal = useCallback((ev: UpcomingEvent) => setModalEvent(ev), [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('upcoming_events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        setEvents(data)
        setLoading(false)
      })
  }, [])

  if (loading || events.length === 0) return null

  return (
    <>
      {/* Deep-link handler: reads ?register= and auto-opens modal */}
      <Suspense fallback={null}>
        <RegisterDeepLink events={events} onOpen={openModal} />
      </Suspense>

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
