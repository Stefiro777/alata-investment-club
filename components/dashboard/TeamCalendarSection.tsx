'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import TeamCalendarModal, { TeamCalendarEvent } from './TeamCalendarModal'

export const TEAM_COLORS: Record<string, string> = {
  events:    '#1a4a3a',
  career:    '#2563eb',
  academy:   '#7c3aed',
  education: '#7c3aed',
  media:     '#dc2626',
  syrto:     '#d97706',
  lab:       '#0891b2',
  alumni:    '#4b5563',
}

const WRITE_TEAMS = ['events', 'career', 'academy']

const TEAM_LABELS: Record<string, string> = {
  events:    'Events',
  career:    'Career',
  academy:   'Academy',
  education: 'Education',
  media:     'Media',
  syrto:     'Syrto',
  lab:       'Lab',
  alumni:    'Alumni',
}

const ALL_TEAMS = Object.keys(TEAM_LABELS)

const WEEK_DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 08–22

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const grid: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) grid.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

function getWeekDates(refDate: Date): Date[] {
  const dow = (refDate.getDay() + 6) % 7
  const mon = new Date(refDate)
  mon.setDate(refDate.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d })
}

function eventsForDate(events: TeamCalendarEvent[], dateStr: string) {
  return events.filter(e => e.start_date <= dateStr && (e.end_date ?? e.start_date) >= dateStr)
}

interface Props {
  slug: string
  currentMember: { id: string; role: string; email: string } | null
}

export default function TeamCalendarSection({ slug, currentMember }: Props) {
  const today   = new Date()
  const canWrite = WRITE_TEAMS.includes(slug)

  const [view, setView]                 = useState<'month' | 'week'>('month')
  const [refDate, setRefDate]           = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [events, setEvents]             = useState<TeamCalendarEvent[]>([])
  const [loading, setLoading]           = useState(true)
  const [teamFilter, setTeamFilter]     = useState<string | null>(null)
  const [modalOpen, setModalOpen]       = useState(false)
  const [modalMode, setModalMode]       = useState<'create' | 'edit'>('create')
  const [selectedDate, setSelectedDate] = useState<string | undefined>()
  const [selectedEvent, setSelectedEvent] = useState<TeamCalendarEvent | undefined>()

  const year  = refDate.getFullYear()
  const month = refDate.getMonth()

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let start: string, end: string
    if (view === 'month') {
      start = isoDate(year, month, 1)
      end   = isoDate(year, month + 1, 0)
    } else {
      const week = getWeekDates(refDate)
      start = isoDate(week[0].getFullYear(), week[0].getMonth(), week[0].getDate())
      end   = isoDate(week[6].getFullYear(), week[6].getMonth(), week[6].getDate())
    }
    const { data } = await supabase
      .from('team_calendar')
      .select('*')
      .lte('start_date', end)
      .gte('end_date', start)
    setEvents((data ?? []) as TeamCalendarEvent[])
    setLoading(false)
  }, [view, year, month, refDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchEvents() }, [fetchEvents])

  function navigate(delta: number) {
    if (view === 'month') {
      setRefDate(new Date(year, month + delta, 1))
    } else {
      const d = new Date(refDate)
      d.setDate(d.getDate() + delta * 7)
      setRefDate(d)
    }
  }

  function formatTitle() {
    if (view === 'month') {
      return refDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    }
    const week = getWeekDates(refDate)
    const s = week[0], e = week[6]
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()}–${e.getDate()} ${s.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
    }
    return `${s.getDate()} ${s.toLocaleDateString('en-GB', { month: 'short' })} – ${e.getDate()} ${e.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`
  }

  function openCreate(dateStr: string) {
    if (!canWrite) return
    setModalMode('create')
    setSelectedDate(dateStr)
    setSelectedEvent(undefined)
    setModalOpen(true)
  }

  function openEdit(ev: TeamCalendarEvent) {
    setModalMode('edit')
    setSelectedDate(ev.start_date)
    setSelectedEvent(ev)
    setModalOpen(true)
  }

  const filteredEvents = teamFilter ? events.filter(e => e.team === teamFilter) : events
  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  // ── Month view ────────────────────────────────────────────────────────────────
  function renderMonth() {
    const grid = getMonthGrid(year, month)
    return (
      <div className="border border-gray-200">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEK_DAYS_SHORT.map(d => (
            <div key={d} className="text-xs text-gray-400 uppercase tracking-wide text-center py-2 font-['Inter']">
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {grid.map((date, idx) => {
            if (!date) return <div key={idx} className="min-h-[80px] border-r border-b border-gray-100 bg-gray-50" />
            const dateStr  = isoDate(date.getFullYear(), date.getMonth(), date.getDate())
            const dayEvts  = filteredEvents.filter(e => eventsForDate([e], dateStr).length > 0)
            const isToday  = dateStr === todayStr
            const otherEvts = events.filter(e => e.team !== slug && eventsForDate([e], dateStr).length > 0)
            const hasOther  = dayEvts.length === 0 && otherEvts.length > 0
            const otherColor = hasOther ? (TEAM_COLORS[otherEvts[0].team] ?? '#e5e7eb') : undefined

            return (
              <div
                key={dateStr}
                onClick={() => openCreate(dateStr)}
                className={`min-h-[80px] border-r border-b border-gray-100 p-1 ${canWrite ? 'cursor-pointer hover:bg-gray-50' : ''} ${date.getMonth() !== month ? 'bg-gray-50' : ''}`}
                style={hasOther ? { borderLeft: `3px solid ${otherColor}` } : undefined}
              >
                <div className="flex justify-end mb-1">
                  <span className={`text-xs font-['Inter'] w-6 h-6 flex items-center justify-center ${isToday ? 'bg-[#1a4a3a] text-white rounded-full' : 'text-gray-500'}`}>
                    {date.getDate()}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvts.slice(0, 3).map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); openEdit(ev) }}
                      className="px-1.5 py-0.5 text-white text-[10px] font-['Inter'] truncate cursor-pointer"
                      style={{ backgroundColor: TEAM_COLORS[ev.team] ?? '#1a4a3a' }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvts.length > 3 && (
                    <div className="text-[10px] text-gray-400 px-1">+{dayEvts.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week view ─────────────────────────────────────────────────────────────────
  function renderWeek() {
    const week = getWeekDates(refDate)

    return (
      <div className="border border-gray-200 overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="py-2 border-r border-gray-200" />
          {week.map((d, i) => {
            const dateStr = isoDate(d.getFullYear(), d.getMonth(), d.getDate())
            const isToday = dateStr === todayStr
            return (
              <div key={i} className="text-center py-2 border-r border-gray-100">
                <div className="text-xs text-gray-400 uppercase font-['Inter']">{WEEK_DAYS_SHORT[i]}</div>
                <div className={`text-sm font-['Inter'] mx-auto w-6 h-6 flex items-center justify-center ${isToday ? 'bg-[#1a4a3a] text-white rounded-full' : 'text-gray-700'}`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* All-day / no-time events */}
        {(() => {
          const noTimeEvts = filteredEvents.filter(e => !e.start_time)
          if (!noTimeEvts.length) return null
          return (
            <div className="grid grid-cols-8 border-b border-gray-200">
              <div className="text-[10px] text-gray-400 font-['Inter'] px-2 py-1 border-r border-gray-200 flex items-center">all-day</div>
              {week.map((d, i) => {
                const dateStr = isoDate(d.getFullYear(), d.getMonth(), d.getDate())
                const dayEvts = noTimeEvts.filter(e => eventsForDate([e], dateStr).length > 0)
                return (
                  <div key={i} className="border-r border-gray-100 p-0.5">
                    {dayEvts.map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => openEdit(ev)}
                        className="px-1.5 py-0.5 text-white text-[10px] font-['Inter'] truncate cursor-pointer mb-0.5"
                        style={{ backgroundColor: TEAM_COLORS[ev.team] ?? '#1a4a3a' }}
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Hourly rows */}
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
            <div className="text-[10px] text-gray-400 font-['Inter'] px-2 py-1 border-r border-gray-200 whitespace-nowrap">
              {String(hour).padStart(2, '0')}:00
            </div>
            {week.map((d, i) => {
              const dateStr  = isoDate(d.getFullYear(), d.getMonth(), d.getDate())
              const hourEvts = filteredEvents.filter(e => {
                if (!e.start_time) return false
                const h = parseInt(e.start_time.split(':')[0])
                return eventsForDate([e], dateStr).length > 0 && h === hour
              })
              return (
                <div
                  key={i}
                  onClick={() => openCreate(dateStr)}
                  className={`border-r border-gray-100 min-h-[40px] p-0.5 ${canWrite ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  {hourEvts.map(ev => (
                    <div
                      key={ev.id}
                      onClick={e => { e.stopPropagation(); openEdit(ev) }}
                      className="px-1.5 py-0.5 text-white text-[10px] font-['Inter'] truncate cursor-pointer"
                      style={{ backgroundColor: TEAM_COLORS[ev.team] ?? '#1a4a3a' }}
                    >
                      {ev.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  const existingOnDate = selectedDate ? eventsForDate(events, selectedDate) : []

  return (
    <div>
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Team pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setTeamFilter(null)}
            className="text-xs font-['Inter'] px-3 py-1 border transition-colors"
            style={
              teamFilter === null
                ? { backgroundColor: '#1a4a3a', color: '#fff', borderColor: '#1a4a3a' }
                : { backgroundColor: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }
            }
          >
            All
          </button>
          {ALL_TEAMS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTeamFilter(prev => prev === t ? null : t)}
              className="text-xs font-['Inter'] px-3 py-1 border transition-colors"
              style={
                teamFilter === t
                  ? { backgroundColor: TEAM_COLORS[t], color: '#fff', borderColor: TEAM_COLORS[t] }
                  : { backgroundColor: 'transparent', color: '#6b7280', borderColor: '#e5e7eb' }
              }
            >
              {TEAM_LABELS[t]}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 ml-auto">
          {(['month', 'week'] as const).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className="text-sm font-['Inter'] px-4 py-1.5 border transition-colors capitalize"
              style={
                view === v
                  ? { borderBottomColor: '#1a4a3a', borderBottomWidth: 2, color: '#1a4a3a', fontWeight: 600, borderTop: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }
                  : { border: '1px solid #e5e7eb', color: '#6b7280' }
              }
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="font-['Cormorant_Garamond',serif] text-lg font-semibold text-gray-900">
          {formatTitle()}
        </h3>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <p className="text-sm text-gray-400 font-['Inter'] py-8 text-center">Loading...</p>
      ) : view === 'month' ? renderMonth() : renderWeek()}

      {/* Modal */}
      {modalOpen && (
        <TeamCalendarModal
          key={`${modalMode}-${selectedDate}-${selectedEvent?.id ?? 'new'}`}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={fetchEvents}
          mode={modalMode}
          initialDate={selectedDate}
          event={selectedEvent}
          currentTeam={slug}
          currentMember={currentMember}
          existingEventsOnDate={existingOnDate}
        />
      )}
    </div>
  )
}
