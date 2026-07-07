'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const INITIAL_COUNT = 3

type CalendarEvent = {
  id: number
  notion_page_id: string
  title: string
  event_date: string
  description: string | null
  division: string | null
  team: string | null
  notion_url: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function EventRow({ event }: { event: CalendarEvent }) {
  const [open, setOpen] = useState(false)
  const hasDescription = !!event.description

  return (
    <div className="bg-white border border-line-faint px-5 py-4">
      {/* Always-visible header row */}
      <div className="flex items-start gap-3">
        {/* Date */}
        <span className="flex-shrink-0 text-xs text-ink-500 whitespace-nowrap w-32 pt-0.5">
          {formatDate(event.event_date)}
        </span>

        {/* Title + READ MORE toggle */}
        <div className="flex-1 min-w-0">
          <p className="font-serif text-base font-semibold text-ink-900 leading-snug">
            {event.title}
          </p>
          {hasDescription && (
            <button
              onClick={() => setOpen(v => !v)}
              className="mt-1 text-[10px] font-medium tracking-widest uppercase text-forest hover:text-[#123a2d] transition-colors"
            >
              {open ? 'READ LESS' : 'READ MORE'}
            </button>
          )}
        </div>

        {/* OPEN link — always visible */}
        <a
          href={event.notion_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-[10px] font-medium tracking-widest uppercase border border-forest text-forest hover:bg-forest hover:text-white px-3 py-1 transition-colors duration-fast"
        >
          OPEN
        </a>
      </div>

      {/* Collapsible description */}
      <div className={`overflow-hidden transition-all duration-fast ${open ? 'max-h-96' : 'max-h-0'}`}>
        <div className="mt-3 pl-32">
          <p className="text-xs text-ink-500 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
            {event.description?.replace(/\\n/g, '\n')}
          </p>
          {(event.division || event.team) && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {event.division && (
                <span className="text-[10px] font-medium tracking-widest uppercase text-forest border border-forest/30 px-2 py-0.5">
                  {event.division}
                </span>
              )}
              {event.team && (
                <span className="text-[10px] font-medium tracking-widest uppercase text-ink-500 border border-line-faint px-2 py-0.5">
                  {event.team}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarEventsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    supabase
      .from('calendar_events')
      .select('*')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .then(({ data }) => {
        setEvents((data ?? []) as CalendarEvent[])
        setLoading(false)
      })
  }, [])

  if (loading) return null

  if (events.length === 0) {
    return (
      <p className="text-sm text-ink-500 py-4">No upcoming events scheduled.</p>
    )
  }

  const visible = expanded ? events : events.slice(0, INITIAL_COUNT)
  const hasMore = events.length > INITIAL_COUNT

  return (
    <div>
      <div className="flex flex-col gap-2">
        {visible.map(event => (
          <EventRow key={event.notion_page_id} event={event} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-forest hover:text-[#123a2d] tracking-wide transition-colors"
        >
          {expanded ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show all ({events.length - INITIAL_COUNT} more)
            </>
          )}
        </button>
      )}
    </div>
  )
}
