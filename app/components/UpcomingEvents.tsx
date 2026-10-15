'use client'

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent } from '@/lib/types'
import EventRegistrationModal from './EventRegistrationModal'
import EventWaitlistModal from './EventWaitlistModal'
import { useEventAvailability } from './useEventAvailability'
import { useMemberAccess } from './useMemberAccess'
import { useCart } from '@/app/components/CartContext'

// Parsed with T00:00:00 (local) so the weekday/day never slide with the timezone.
function parseDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    year: d.getFullYear(),
    monthKey: dateStr.slice(0, 7),
    monthName: d.toLocaleDateString('en-US', { month: 'long' }),
    day: String(d.getDate()).padStart(2, '0'),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
  }
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

type MonthGroup = { key: string; monthName: string; year: number; events: UpcomingEvent[] }

function groupByMonth(events: UpcomingEvent[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const ev of events) {
    const { monthKey, monthName, year } = parseDate(ev.date)
    const last = groups[groups.length - 1]
    if (last && last.key === monthKey) last.events.push(ev)
    else groups.push({ key: monthKey, monthName, year, events: [ev] })
  }
  return groups
}

// All pills share one footprint; only the fill changes.
const PILL = 'inline-flex items-center text-[10px] font-medium tracking-[0.2em] uppercase px-3.5 py-2 leading-none whitespace-nowrap'
const PILL_OUTLINE = `${PILL} border border-forest text-forest`
const PILL_SOLID = `${PILL} border border-forest bg-forest text-white`
const PILL_TINT = `${PILL} border border-transparent bg-forest/[0.12] text-forest`
// The action cluster sits above the row-wide link but lets clicks through; only real controls catch them.
const BUTTON = `${PILL_SOLID} pointer-events-auto transition-colors duration-fast hover:bg-forest-deep hover:border-forest-deep`
const LINK_TEXT = 'pointer-events-auto text-[10px] font-semibold tracking-[0.2em] uppercase text-forest border-b border-forest pb-[3px] leading-none transition-colors hover:text-forest-deep'

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

function StatusPill({ status }: { status: UpcomingEvent['status'] }) {
  return <span className={PILL_OUTLINE}>{status === 'completed' ? 'Completed' : 'Coming Soon'}</span>
}

// "Name w/ Guest": the guest goes in italic forest, the prefix "w/ " is kept.
function EventTitle({ title }: { title: string }) {
  const m = /\s*w\/\s*/i.exec(title)
  if (!m) return <>{title}</>
  const before = title.slice(0, m.index)
  const after = title.slice(m.index + m[0].length)
  return (
    <>
      {before}{before ? ' ' : ''}
      <span className="italic font-medium text-forest">w/ {after}</span>
    </>
  )
}

function UpcomingEventRow({
  event,
  soldOut,
  membersLocked,
  authenticated,
  onOpenModal,
  onOpenWaitlist,
}: {
  event: UpcomingEvent
  soldOut: boolean
  membersLocked: boolean
  authenticated: boolean
  onOpenModal: (event: UpcomingEvent) => void
  onOpenWaitlist: (event: UpcomingEvent) => void
}) {
  const [added, setAdded] = useState(false)
  const { day, weekday } = parseDate(event.date)
  const { addItem } = useCart()
  const hasTicket    = event.status === 'open' && !soldOut && !membersLocked && event.ticket_price_cents !== null && event.ticket_price_cents !== undefined
  const isPaidTicket = hasTicket && (event.ticket_price_cents ?? 0) > 0
  const isFreeTicket = hasTicket && event.ticket_price_cents === 0

  function handleAddTicket() {
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

  const membersBadge = event.members_only ? <span className={PILL_TINT}>Members only</span> : null

  let action: React.ReactNode
  if (event.status === 'open' && membersLocked) {
    action = authenticated ? (
      <span className={PILL_TINT}>Members only</span>
    ) : (
      <Link href="/login" className={`${PILL_TINT} pointer-events-auto transition-colors hover:bg-forest/20`}>
        Login to register
      </Link>
    )
  } else if (isPaidTicket || isFreeTicket) {
    action = (
      <>
        {membersBadge}
        <button type="button" onClick={handleAddTicket} className={BUTTON}>
          {added
            ? 'Added ✓'
            : isFreeTicket
              ? 'Add ticket — Free'
              : `Add ticket — ${fmtEur(event.ticket_price_cents ?? 0)}`}
        </button>
      </>
    )
  } else if (soldOut) {
    action = (
      <>
        {membersBadge}
        <span className={PILL_SOLID}>Sold out</span>
        <button type="button" onClick={() => onOpenWaitlist(event)} className={LINK_TEXT}>
          Join waitlist
        </button>
      </>
    )
  } else if (event.status === 'open') {
    action = (
      <>
        {membersBadge}
        {event.action_type === 'link' && event.action_link ? (
          <a href={event.action_link} target="_blank" rel="noopener noreferrer" className={BUTTON}>
            Register Now
          </a>
        ) : event.action_type === 'form' ? (
          <button type="button" onClick={() => onOpenModal(event)} className={BUTTON}>
            Register Now
          </button>
        ) : (
          <span className={PILL_SOLID}>Register Now</span>
        )}
      </>
    )
  } else {
    action = (
      <>
        {membersBadge}
        <StatusPill status={event.status} />
      </>
    )
  }

  return (
    <div
      className="group relative grid grid-cols-[3.5rem_1fr] sm:grid-cols-[88px_1fr] gap-x-4 sm:gap-x-6 gap-y-3 lg:flex lg:items-center lg:gap-9 py-7 border-b border-forest/[0.22] pl-0 hover:pl-5 focus-within:pl-5 hover:bg-forest/[0.07] focus-within:bg-forest/[0.07] transition-[padding,background-color] duration-[250ms] ease-out"
    >
      {/* Date */}
      <div className="row-span-2 lg:row-span-1 lg:w-[88px] flex-shrink-0">
        <p className="font-serif text-[44px] sm:text-[56px] font-semibold text-ink-900 leading-none tabular-nums">{day}</p>
        <p className="text-[10px] tracking-[0.25em] uppercase text-ink-500 mt-2 leading-none">{weekday}</p>
      </div>

      {/* Title — the link is stretched over the whole row; buttons sit above it */}
      <div className="min-w-0 lg:flex-1">
        <h3 className="font-serif text-[28px] sm:text-[34px] font-semibold text-ink-900 leading-[1.1]">
          {event.slug ? (
            <Link
              href={`/events/${event.slug}`}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-forest"
            >
              <EventTitle title={event.title} />
            </Link>
          ) : (
            <EventTitle title={event.title} />
          )}
        </h3>
      </div>

      {/* Action */}
      <div className="pointer-events-none relative z-10 col-start-2 lg:col-start-auto flex flex-wrap items-center gap-3 lg:flex-shrink-0 lg:justify-end">
        {action}
      </div>
    </div>
  )
}

function MonthGroupBlock({
  group,
  currentYear,
  isSoldOut,
  membersLocked,
  authenticated,
  onOpenModal,
  onOpenWaitlist,
}: {
  group: MonthGroup
  currentYear: number
  isSoldOut: (ev: UpcomingEvent) => boolean
  membersLocked: (ev: UpcomingEvent) => boolean
  authenticated: boolean
  onOpenModal: (event: UpcomingEvent) => void
  onOpenWaitlist: (event: UpcomingEvent) => void
}) {
  const count = group.events.length
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] lg:grid-cols-[240px_1fr] border-t border-forest">
      <div className="pt-6 sm:pt-7 pb-2 sm:pb-0 sm:pr-4 flex items-baseline gap-4 sm:block">
        <h3 className="font-serif italic font-medium text-forest leading-none text-[40px] sm:text-[48px] lg:text-[60px]">
          {group.monthName}
          {group.year !== currentYear && (
            <span className="not-italic ml-2 text-[0.55em] sm:block sm:ml-0 sm:mt-2">{group.year}</span>
          )}
        </h3>
        <p className="text-[11px] tracking-[0.25em] uppercase text-forest/70 sm:mt-3">
          {count} {count === 1 ? 'Event' : 'Events'}
        </p>
      </div>
      <div>
        {group.events.map(event => (
          <UpcomingEventRow
            key={event.id}
            event={event}
            soldOut={isSoldOut(event)}
            membersLocked={membersLocked(event)}
            authenticated={authenticated}
            onOpenModal={onOpenModal}
            onOpenWaitlist={onOpenWaitlist}
          />
        ))}
      </div>
    </div>
  )
}

export default function UpcomingEvents() {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [modalEvent, setModalEvent] = useState<UpcomingEvent | null>(null)
  const [waitlistEvent, setWaitlistEvent] = useState<UpcomingEvent | null>(null)
  const availability = useEventAvailability()
  const access = useMemberAccess()
  const today = new Date().toISOString().split('T')[0]

  // Sold out only matters for events that have not happened yet: past events
  // keep showing "Completed" as before. Coming-soon events are not open for
  // registration, so they keep their own badge.
  const isSoldOut = useCallback(
    (ev: UpcomingEvent) => !!availability[ev.id]?.sold_out && ev.date >= today && ev.status !== 'coming_soon',
    [availability, today],
  )

  const membersLocked = useCallback(
    (ev: UpcomingEvent) => !!ev.members_only && !access.active,
    [access.active],
  )

  const openModal = useCallback(
    (ev: UpcomingEvent) => {
      if (ev.members_only && !access.active) return // members-only: the server enforces this too
      if (isSoldOut(ev)) setWaitlistEvent(ev)
      else setModalEvent(ev)
    },
    [isSoldOut, access.active],
  )

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

  const groups = useMemo(() => groupByMonth(events), [events])
  const currentYear = new Date().getFullYear()

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

          {/* One block per month, chronological */}
          <div className="flex flex-col gap-10">
            {groups.map(group => (
              <MonthGroupBlock
                key={group.key}
                group={group}
                currentYear={currentYear}
                isSoldOut={isSoldOut}
                membersLocked={membersLocked}
                authenticated={access.authenticated}
                onOpenModal={openModal}
                onOpenWaitlist={setWaitlistEvent}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist modal (replaces the registration form for sold-out events) */}
      {waitlistEvent && (
        <EventWaitlistModal
          event={{ id: waitlistEvent.id, title: waitlistEvent.title, date: waitlistEvent.date }}
          onClose={() => setWaitlistEvent(null)}
        />
      )}

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
