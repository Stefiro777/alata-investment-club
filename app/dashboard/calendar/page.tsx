'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { TEAM_BADGE } from '../teamColors'

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: 'all',       label: 'Tutti' },
  { key: 'events',    label: 'Events' },
  { key: 'media',     label: 'Media' },
  { key: 'career',    label: 'Career' },
  { key: 'education', label: 'Education' },
  { key: 'academy',   label: 'Academy' },
  { key: 'syrto',     label: 'Syrto' },
  { key: 'lab',       label: 'Lab' },
  { key: 'alumni',    label: 'Alumni' },
] as const

type CalFilter = 'all' | 'events' | 'media' | 'career' | 'education' | 'academy' | 'syrto' | 'lab' | 'alumni' | 'posts'

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

type PostPlan = {
  id: string
  title: string
  description: string | null
  team: string | null
  scheduled_date: string // YYYY-MM-DD
  status: string
  created_by: string
}

type DayItem =
  | { kind: 'task'; data: CalTask }
  | { kind: 'post'; data: PostPlan }

// ── Helpers ───────────────────────────────────────────────────────────────────

function priorityDotColor(p: string): string {
  if (p === 'high')   return '#dc2626'
  if (p === 'low')    return '#6b7280'
  return '#d97706'
}

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
  const found = FILTER_OPTIONS.find(o => o.key === t)
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
  const firstDay = new Date(year, month, 1)
  const rawDow = firstDay.getDay()
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
  const badge = task.team ? (TEAM_BADGE[task.team] ?? null) : null
  const bg    = badge?.bg   ?? '#e5e7eb'
  const color = badge?.text ?? '#111827'

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{ backgroundColor: bg, color }}
      className="w-full text-left text-[10px] font-semibold uppercase tracking-wide pr-1.5 py-0.5 truncate flex items-stretch"
    >
      <span
        style={{ backgroundColor: priorityDotColor(task.priority), width: 5, flexShrink: 0, borderRadius: 0 }}
        className="mr-1 self-stretch"
      />
      <span className="truncate">{title}</span>
    </button>
  )
}

// ── PostPlanPill ──────────────────────────────────────────────────────────────

function PostPlanPill({ plan, onClick }: { plan: PostPlan; onClick: () => void }) {
  const title = plan.title.length > 20 ? plan.title.slice(0, 20) + '…' : plan.title
  const teamColor = plan.team ? (TEAM_BADGE[plan.team]?.bg ?? '#555555') : '#555555'

  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick() }}
      style={{ backgroundColor: '#3a1a2a', color: '#ffffff' }}
      className="w-full text-left text-[10px] font-semibold uppercase tracking-wide py-0.5 flex items-stretch"
    >
      <span style={{ backgroundColor: teamColor, width: 5, flexShrink: 0, borderRadius: 0 }} className="self-stretch" />
      <span style={{ backgroundColor: '#e879a0', width: 5, flexShrink: 0, borderRadius: 0 }} className="mr-1 self-stretch" />
      <span className="truncate self-center">{title}</span>
    </button>
  )
}

// ── PostPlanPopup ─────────────────────────────────────────────────────────────

function PostPlanPopup({
  plan,
  onClose,
  onDelete,
}: {
  plan: PostPlan
  onClose: () => void
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug flex-1">{plan.title}</h3>
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
              <p className="text-ink-900">{teamLabel(plan.team)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Data pianificata</p>
              <p className="text-ink-900">
                {new Date(plan.scheduled_date + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Status</p>
              <p className="text-ink-900">{plan.status}</p>
            </div>
          </div>
          {plan.description && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Descrizione</p>
              <p className="text-ink-900 whitespace-pre-wrap">{plan.description}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-5 border-t border-[#e5e7eb] pt-3">
          {confirming ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-ink-500 flex-1">Eliminare questo post?</span>
              <button
                type="button"
                onClick={() => { onDelete(plan.id); onClose() }}
                className="text-xs font-medium uppercase tracking-wide px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Sì, elimina
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-ink-900 transition-colors"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-red-600 transition-colors"
            >
              Elimina post
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── DayPopover ────────────────────────────────────────────────────────────────

function DayPopover({
  dateStr,
  tasks,
  postPlans,
  onClose,
  onTaskClick,
  onPostClick,
}: {
  dateStr: string
  tasks: CalTask[]
  postPlans: PostPlan[]
  onClose: () => void
  onTaskClick: (t: CalTask) => void
  onPostClick: (p: PostPlan) => void
}) {
  const dateDisplay = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <h3 className="font-serif text-lg font-bold text-ink-900">{dateDisplay}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-3 flex flex-col gap-1 max-h-72 overflow-y-auto">
          {tasks.map(t => (
            <TaskPill
              key={t.id}
              task={t}
              onClick={() => { onClose(); onTaskClick(t) }}
            />
          ))}
          {postPlans.length > 0 && tasks.length > 0 && (
            <div className="my-1 border-t border-[#e5e7eb]" />
          )}
          {postPlans.map(p => (
            <PostPlanPill key={p.id} plan={p} onClick={() => { onClose(); onPostClick(p) }} />
          ))}
        </div>
      </div>
    </div>
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
  const [postPlans, setPostPlans] = useState<PostPlan[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter] = useState<CalFilter>('all')
  const [popup, setPopup]           = useState<CalTask | null>(null)
  const [postPopup, setPostPopup]   = useState<PostPlan | null>(null)
  const [dayPopover, setDayPopover] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [taskResult, postResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, due_date, priority, team, assigned_to, status')
          .not('due_date', 'is', null)
          .order('due_date', { ascending: true }),
        supabase
          .from('post_plans')
          .select('id, title, description, team, scheduled_date, status, created_by')
          .not('scheduled_date', 'is', null)
          .order('scheduled_date', { ascending: true }),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTasks((taskResult.data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? '',
        due_date: r.due_date as string,
        priority: r.priority ?? 'medium',
        team: r.team ?? null,
        assigned_to: r.assigned_to ?? [],
        status: r.status ?? 'todo',
      })))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPostPlans((postResult.data ?? []).map((r: any) => ({
        id: r.id,
        title: r.title ?? '',
        description: r.description ?? null,
        team: r.team ?? null,
        scheduled_date: r.scheduled_date as string,
        status: r.status ?? 'planned',
        created_by: r.created_by ?? '',
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

  const filteredTasks = useMemo(() => {
    if (filter === 'posts') return []
    if (filter === 'all')   return tasks
    return tasks.filter(t => t.team === filter)
  }, [tasks, filter])

  const filteredPosts = useMemo(() => {
    if (filter === 'all' || filter === 'posts') return postPlans
    return postPlans.filter(p => p.team === filter)
  }, [postPlans, filter])

  /** Map from YYYY-MM-DD → tasks */
  const tasksByDate = useMemo(() => {
    const map: Record<string, CalTask[]> = {}
    for (const t of filteredTasks) {
      if (!map[t.due_date]) map[t.due_date] = []
      map[t.due_date].push(t)
    }
    return map
  }, [filteredTasks])

  /** Map from YYYY-MM-DD → post plans */
  const postsByDate = useMemo(() => {
    const map: Record<string, PostPlan[]> = {}
    for (const p of filteredPosts) {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = []
      map[p.scheduled_date].push(p)
    }
    return map
  }, [filteredPosts])

  async function handleDeletePost(id: string) {
    setPostPlans(prev => prev.filter(p => p.id !== id))
    const supabase = createClient()
    await supabase.from('post_plans').delete().eq('id', id)
  }

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

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {FILTER_OPTIONS.map(o => (
          <button
            key={o.key}
            type="button"
            onClick={() => setFilter(o.key as CalFilter)}
            className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${
              filter === o.key
                ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                : 'bg-white text-ink-500 border-[#e5e7eb] hover:border-[#1a4a3a] hover:text-ink-900'
            }`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setFilter('posts')}
          className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${
            filter === 'posts'
              ? 'bg-[#3a1a2a] text-white border-[#3a1a2a]'
              : 'bg-white text-ink-500 border-[#e5e7eb] hover:border-[#3a1a2a] hover:text-ink-900'
          }`}
        >
          Post Pianificati
        </button>
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
            const dateStr    = toISODate(day)
            const isToday    = dateStr === todayStr
            const inMonth    = day.getMonth() === month
            const dayTasks   = tasksByDate[dateStr] ?? []
            const dayPosts   = postsByDate[dateStr] ?? []
            const allItems: DayItem[] = [
              ...dayTasks.map(d => ({ kind: 'task' as const, data: d })),
              ...dayPosts.map(d => ({ kind: 'post' as const, data: d })),
            ]
            const visible   = allItems.slice(0, 2)
            const overflow  = allItems.length - visible.length
            const isLastRow = i >= 35

            return (
              <div
                key={dateStr + i}
                className={[
                  'min-h-[96px] p-2 border-b border-r border-[#e5e7eb] flex flex-col gap-1',
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

                {/* Item pills */}
                <div className="flex flex-col gap-0.5 flex-1">
                  {visible.map(item =>
                    item.kind === 'task'
                      ? <TaskPill key={item.data.id} task={item.data} onClick={() => setPopup(item.data)} />
                      : <PostPlanPill key={item.data.id} plan={item.data} onClick={() => setPostPopup(item.data)} />
                  )}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDayPopover(dateStr) }}
                      className="text-[10px] text-ink-400 hover:text-ink-700 pl-1 text-left transition-colors"
                    >
                      +{overflow} altri
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-wide text-ink-400 font-medium">Priorità:</span>
          {[
            { label: 'High',   color: '#dc2626' },
            { label: 'Medium', color: '#d97706' },
            { label: 'Low',    color: '#6b7280' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
              <span style={{ backgroundColor: l.color, width: 8, height: 8, borderRadius: 0, display: 'inline-block', flexShrink: 0 }} />
              {l.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ backgroundColor: '#e879a0', width: 8, height: 8, borderRadius: 0, display: 'inline-block', flexShrink: 0 }} />
          <span className="text-[10px] uppercase tracking-wide text-ink-400 font-medium">Post LinkedIn</span>
        </div>
      </div>

      {/* Day popover — all items for a day */}
      {dayPopover && (
        <DayPopover
          dateStr={dayPopover}
          tasks={tasksByDate[dayPopover] ?? []}
          postPlans={postsByDate[dayPopover] ?? []}
          onClose={() => setDayPopover(null)}
          onTaskClick={t => setPopup(t)}
          onPostClick={p => setPostPopup(p)}
        />
      )}

      {/* Task detail popup */}
      {popup && <TaskPopup task={popup} onClose={() => setPopup(null)} />}

      {/* Post plan detail popup */}
      {postPopup && (
        <PostPlanPopup
          plan={postPopup}
          onClose={() => setPostPopup(null)}
          onDelete={handleDeletePost}
        />
      )}

    </div>
  )
}
