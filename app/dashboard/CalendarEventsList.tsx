'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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

export default function CalendarEventsList() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

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
      <p className="text-sm text-[#6b7280] py-4">No upcoming events scheduled.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map(event => (
        <a
          key={event.notion_page_id}
          href={event.notion_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-start justify-between gap-6 bg-white border border-black/10 hover:border-[#1a4a3a] px-5 py-4 transition-colors duration-150"
        >
          <div className="flex-1 min-w-0">
            <p className="font-serif text-base font-semibold text-[#0a0a0a] group-hover:text-[#1a4a3a] transition-colors leading-snug">
              {event.title}
            </p>
            {event.description && (
              <p className="text-xs text-[#6b7280] mt-1 leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
            {(event.division || event.team) && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {event.division && (
                  <span className="text-[10px] font-medium tracking-widest uppercase text-[#1a4a3a] border border-[#1a4a3a]/30 px-2 py-0.5">
                    {event.division}
                  </span>
                )}
                {event.team && (
                  <span className="text-[10px] font-medium tracking-widest uppercase text-[#6b7280] border border-black/10 px-2 py-0.5">
                    {event.team}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-[#6b7280] whitespace-nowrap">{formatDate(event.event_date)}</p>
            <svg className="w-3.5 h-3.5 text-[#9ca3af] group-hover:text-[#1a4a3a] transition-colors mt-1 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </a>
      ))}
    </div>
  )
}
