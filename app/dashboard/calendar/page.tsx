'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_OPTIONS = [
  { key: 'all',     label: 'Tutti' },
  { key: 'events',  label: 'Events' },
  { key: 'media',   label: 'Media' },
  { key: 'career',  label: 'Career' },
  { key: 'academy', label: 'Academy' },
  { key: 'syrto',   label: 'Syrto' },
  { key: 'lab',     label: 'Lab' },
  { key: 'alumni',  label: 'Alumni' },
] as const

type TeamFilter = 'all' | 'events' | 'media' | 'career' | 'academy' | 'syrto' | 'lab' | 'alumni'

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

// ── Types ─────────────────────────────────────────────────────────────────────

type CalTask = {
  id: string
  title: string
  due_date: string   // YYYY-MM-DD
  priority: string
  team: string | null
  assigned_to: string[]
  status: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function priorityColor(p: string): string {
  if (p === 'high')   return 'bg-[#7f1d1d] text-white'
  if (p === 'low')    return 'bg-[#374151] text-white'
  return 'bg-[#92400e] text-white'
}

function statusLabel(s: string): string {
  if (s === 'in_progress') return 'In corso'
  if (s === 'done')        return 'Completata'
  return 'Todo'
}

function priorityLabel(p: string): string {
  if (p === 'high') return 'High'
  if (p === 'low')  return 'Low'
  return 'Medium'
}

function teamLabel(t: string | null): string {
  if (!t) return '—'
  const found = TEAM_OPTIONS.find(o => o.key === t)
  return found ? found.label : t
}

/** ISO date string YYYY-MM-DD from a local Date */
function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Returns array of Date objects for the calendar grid (always 42 cells = 6 rows × 7 cols) */
function buildGrid(year: number, month: number): Date[] {
  // first day of month (0=Sun…6=Sat), convert to Mon-based (0=Mon…6=Sun)
  const firstDay = new Date(year, month, 1)
  const rawDow = firstDay.getDay() // 0=Sun
  const dow = rawDow === 0 ? 6 : rawDow - 1 // Mon-based

  const start = new Date(year, month, 1 - dow)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

// ── TaskPill ──────────────────────────────────────────────────────────────────

function TaskPill({ task, onClick }: { task: CalTask; onClick: () => void }) {
  const title = task.title.length > 22 ? task.title.slice(0, 22) + '…' : task.title
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      className={`w-full text-left text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 truncate ${priorityColor(task.priority)}`}
    >
      {title}
    </button>
  )
}

// ── TaskPopup ─────────────────────────────────────────────────────────────────

function TaskPopup({ task, onClose }: { task: CalTask; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug flex-1">{task.title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Team</p>
              <p className="text-ink-900">{teamLabel(task.team)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Scadenza</p>
              <p className="text-ink-900">
                {new Date(task.due_date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Status</p>
              <p className="text-ink-900">{statusLabel(task.status)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Priorità</p>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 ${priorityColor(task.priority)}`}>
                {priorityLabel(task.priority)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear]           = useState(today.getFullYear())
  const [month, setMonth]         = useState(today.getMonth())
  const [tasks, setTasks]         = useState<CalTask[]>([])
  const [loading, setLoading]     = useState(true)
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all')
  const [popup, setPopup]         = useState<CalTask | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date, priority, team, assigned_to, status')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTasks((data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? '',
        due_date: r.due_date as string,
        priority: r.priority ?? 'medium',
        team: r.team ?? null,
        assigned_to: r.assigned_to ?? [],
        status: r.status ?? 'todo',
      })))
      setLoading(false)
    }
    load()
  }, [])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const filteredTasks = useMemo(
    () => teamFilter === 'all' ? tasks : tasks.filter(t => t.team === teamFilter),
    [tasks, teamFilter]
  )

  /** Map from YYYY-MM-DD → tasks */
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalTask[]> = {}
    for (const t of filteredTasks) {
      if (!map[t.due_date]) map[t.due_date] = []
      map[t.due_date].push(t)
    }
    return map
  }, [filteredTasks])

  const grid = useMemo(() => buildGrid(year, month), [year, month])

  const todayStr = toISODate(today)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-sm text-ink-500">Caricamento...</div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">

      {/* Page title */}
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Calendario</h1>
      <div className="w-8 h-px bg-[#1a4a3a] mb-8" />

      {/* Team filter */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {TEAM_OPTIONS.map(o => (
          <button
            key={o.key}
            type="button"
            onClick={() => setTeamFilter(o.key as TeamFilter)}
            className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${
              teamFilter === o.key
                ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                : 'bg-white text-ink-500 border-[#e5e7eb] hover:border-[#1a4a3a] hover:text-ink-900'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* Month nav */}
      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 border border-[#e5e7eb] hover:border-[#1a4a3a] transition-colors"
          aria-label="Mese precedente"
        >
          <svg className="w-4 h-4 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="font-serif text-xl font-semibold text-ink-900 w-44 text-center">
          {MONTHS_IT[month]} {year}
        </h2>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 border border-[#e5e7eb] hover:border-[#1a4a3a] transition-colors"
          aria-label="Mese successivo"
        >
          <svg className="w-4 h-4 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Calendar grid */}
      <div className="border border-[#e5e7eb]">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-[#e5e7eb]">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells — 6 rows */}
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const dateStr   = toISODate(day)
            const isToday   = dateStr === todayStr
            const inMonth   = day.getMonth() === month
            const dayTasks  = tasksByDate[dateStr] ?? []
            const visible   = dayTasks.slice(0, 2)
            const overflow  = dayTasks.length - visible.length
            const isLastRow = i >= 35 // last row, no bottom border needed

            return (
              <div
                key={dateStr + i}
                className={[
                  'min-h-[96px] p-2 border-b border-r border-[#e5e7eb] flex flex-col gap-1',
                  // remove right border on last col, bottom on last row
                  (i + 1) % 7 === 0 ? 'border-r-0' : '',
                  isLastRow ? 'border-b-0' : '',
                ].join(' ')}
              >
                {/* Day number */}
                <div className="flex-shrink-0">
                  <span
                    className={[
                      'inline-flex items-center justify-center w-6 h-6 text-xs font-semibold',
                      isToday
                        ? 'bg-[#1a4a3a] text-white'
                        : inMonth
                          ? 'text-ink-900'
                          : 'text-ink-300',
                    ].join(' ')}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Task pills */}
                <div className="flex flex-col gap-0.5 flex-1">
                  {visible.map(t => (
                    <TaskPill key={t.id} task={t} onClick={() => setPopup(t)} />
                  ))}
                  {overflow > 0 && (
                    <span className="text-[10px] text-ink-400 pl-1">+{overflow} altri</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-[10px] uppercase tracking-wide text-ink-400 font-medium">Priorità:</span>
        {[
          { label: 'High',   cls: 'bg-[#7f1d1d] text-white' },
          { label: 'Medium', cls: 'bg-[#92400e] text-white' },
          { label: 'Low',    cls: 'bg-[#374151] text-white' },
        ].map(l => (
          <span key={l.label} className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 ${l.cls}`}>
            {l.label}
          </span>
        ))}
      </div>

      {/* Task popup */}
      {popup && <TaskPopup task={popup} onClose={() => setPopup(null)} />}

    </div>
  )
}
