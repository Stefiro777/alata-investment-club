'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { TEAM_BADGE } from '../teamColors'

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: 'all',       label: 'All' },
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

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const PLATFORM_COLORS: Record<string, string> = {
  Instagram:  '#E1306C',
  LinkedIn:   '#0077B5',
  TikTok:     '#000000',
  YouTube:    '#FF0000',
  Newsletter: 'var(--forest)',
}

const CONTENT_TYPES: Record<string, string[]> = {
  Instagram:  ['Post', 'Reel', 'Story', 'Carosello'],
  LinkedIn:   ['Post', 'Articolo', 'Carosello'],
  TikTok:     ['Video'],
  YouTube:    ['Video', 'Short'],
  Newsletter: ['Newsletter'],
}

const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Newsletter']
const PED_STATUSES = ['draft', 'scheduled', 'published'] as const
type PedStatus = typeof PED_STATUSES[number]

// ── Types ─────────────────────────────────────────────────────────────────────

type CalTask = {
  id: string
  title: string
  due_date: string
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
  scheduled_date: string
  status: string
  created_by: string
}

type DayItem =
  | { kind: 'task'; data: CalTask }
  | { kind: 'post'; data: PostPlan }

type UpcomingEventItem = {
  id: string
  date: string
  title: string
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  status: string
  _source?: 'event' | 'task'
  _team?: string | null
}

type PedPost = {
  id: string
  title: string
  description: string | null
  team: string | null
  scheduled_date: string
  status: string
  platform: string | null
  content_type: string | null
  assigned_to: string | null
  notes: string | null
  attachment_url: string | null
}

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

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const rawDow = firstDay.getDay()
  const dow = rawDow === 0 ? 6 : rawDow - 1

  const start = new Date(year, month, 1 - dow)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Shared: MonthNav ──────────────────────────────────────────────────────────

function MonthNav({
  year, month,
  onPrev, onNext,
}: { year: number; month: number; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <button
        type="button"
        onClick={onPrev}
        className="p-1.5 border border-[#e5e7eb] hover:border-forest transition-colors"
        aria-label="Mese precedente"
      >
        <svg className="w-4 h-4 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h2 className="font-serif text-xl font-semibold text-ink-900 w-44 text-center">
        {MONTHS[month]} {year}
      </h2>
      <button
        type="button"
        onClick={onNext}
        className="p-1.5 border border-[#e5e7eb] hover:border-forest transition-colors"
        aria-label="Mese successivo"
      >
        <svg className="w-4 h-4 text-ink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}

// ── Tasks tab components ───────────────────────────────────────────────────────

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

function PostPlanPopup({
  plan, onClose, onDelete,
}: { plan: PostPlan; onClose: () => void; onDelete: (id: string) => void }) {
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
              <p className="text-ink-900">{fmtDate(plan.scheduled_date)}</p>
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
              <span className="text-sm text-ink-500 flex-1">Delete this post?</span>
              <button type="button" onClick={() => { onDelete(plan.id); onClose() }} className="text-xs font-medium uppercase tracking-wide px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white transition-colors">
                Yes, delete
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-ink-900 transition-colors">
                Cancel
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-red-600 transition-colors">
              Delete post
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function DayPopover({
  dateStr, tasks, postPlans, onClose, onTaskClick, onPostClick,
}: {
  dateStr: string; tasks: CalTask[]; postPlans: PostPlan[]
  onClose: () => void; onTaskClick: (t: CalTask) => void; onPostClick: (p: PostPlan) => void
}) {
  const dateDisplay = new Date(dateStr + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
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
          {tasks.map(t => <TaskPill key={t.id} task={t} onClick={() => { onClose(); onTaskClick(t) }} />)}
          {postPlans.length > 0 && tasks.length > 0 && <div className="my-1 border-t border-[#e5e7eb]" />}
          {postPlans.map(p => <PostPlanPill key={p.id} plan={p} onClick={() => { onClose(); onPostClick(p) }} />)}
        </div>
      </div>
    </div>
  )
}

function TaskPopup({ task, onClose }: { task: CalTask; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
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
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Due date</p>
              <p className="text-ink-900">{fmtDate(task.due_date)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Status</p>
              <p className="text-ink-900">{statusLabel(task.status)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-0.5">Priority</p>
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

// ── TasksTab ──────────────────────────────────────────────────────────────────

function TasksTab() {
  const today = new Date()
  const [year, setYear]           = useState(today.getFullYear())
  const [month, setMonth]         = useState(today.getMonth())
  const [tasks, setTasks]         = useState<CalTask[]>([])
  const [postPlans, setPostPlans] = useState<PostPlan[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState<CalFilter>('all')
  const [popup, setPopup]                   = useState<CalTask | null>(null)
  const [postPopup, setPostPopup]           = useState<PostPlan | null>(null)
  const [dayPopover, setDayPopover]         = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [taskResult, postResult] = await Promise.all([
        supabase.from('tasks').select('id, title, due_date, priority, team, assigned_to, status').not('due_date', 'is', null).order('due_date', { ascending: true }),
        supabase.from('post_plans').select('id, title, description, team, scheduled_date, status, created_by').not('scheduled_date', 'is', null).order('scheduled_date', { ascending: true }),
      ])

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTasks((taskResult.data ?? []).map((r: any) => ({
        id: r.id, title: r.title ?? '', due_date: r.due_date as string,
        priority: r.priority ?? 'medium', team: r.team ?? null, assigned_to: r.assigned_to ?? [], status: r.status ?? 'todo',
      })))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPostPlans((postResult.data ?? []).map((r: any) => ({
        id: r.id, title: r.title ?? '', description: r.description ?? null,
        team: r.team ?? null, scheduled_date: r.scheduled_date as string, status: r.status ?? 'planned', created_by: r.created_by ?? '',
      })))
      setLoading(false)
    }
    load()
  }, [])

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const filteredTasks = useMemo(() => {
    if (filter === 'posts') return []
    if (filter === 'all')   return tasks
    return tasks.filter(t => t.team === filter)
  }, [tasks, filter])

  const filteredPosts = useMemo(() => {
    if (filter === 'all' || filter === 'posts') return postPlans
    return postPlans.filter(p => p.team === filter)
  }, [postPlans, filter])

  const tasksByDate = useMemo(() => {
    const map: Record<string, CalTask[]> = {}
    for (const t of filteredTasks) {
      if (!map[t.due_date]) map[t.due_date] = []
      map[t.due_date].push(t)
    }
    return map
  }, [filteredTasks])

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

  if (loading) return <div className="py-16 text-sm text-ink-500">Loading...</div>

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {FILTER_OPTIONS.map(o => (
          <button key={o.key} type="button" onClick={() => setFilter(o.key as CalFilter)}
            className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${filter === o.key ? 'bg-forest text-white border-forest' : 'bg-white text-ink-500 border-[#e5e7eb] hover:border-forest hover:text-ink-900'}`}>
            {o.label}
          </button>
        ))}
        <button type="button" onClick={() => setFilter('posts')}
          className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${filter === 'posts' ? 'bg-[#3a1a2a] text-white border-[#3a1a2a]' : 'bg-white text-ink-500 border-[#e5e7eb] hover:border-[#3a1a2a] hover:text-ink-900'}`}>
          Post Pianificati
        </button>
      </div>

      <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />

      {/* Calendar grid */}
      <div className="border border-[#e5e7eb]">
        <div className="grid grid-cols-7 border-b border-[#e5e7eb]">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const dateStr   = toISODate(day)
            const isToday   = dateStr === todayStr
            const inMonth   = day.getMonth() === month
            const dayTasks  = tasksByDate[dateStr] ?? []
            const dayPosts  = postsByDate[dateStr] ?? []
            const allItems: DayItem[] = [
              ...dayTasks.map(d => ({ kind: 'task' as const, data: d })),
              ...dayPosts.map(d => ({ kind: 'post' as const, data: d })),
            ]
            const visible  = allItems.slice(0, 2)
            const overflow = allItems.length - visible.length
            const isLastRow = i >= 35

            return (
              <div key={dateStr + i} className={['min-h-[96px] p-2 border-b border-r border-[#e5e7eb] flex flex-col gap-1', (i + 1) % 7 === 0 ? 'border-r-0' : '', isLastRow ? 'border-b-0' : ''].join(' ')}>
                <div className="flex-shrink-0">
                  <span className={['inline-flex items-center justify-center w-6 h-6 text-xs font-semibold', isToday ? 'bg-forest text-white' : inMonth ? 'text-ink-900' : 'text-ink-300'].join(' ')}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1">
                  {visible.map(item =>
                    item.kind === 'task'
                      ? <TaskPill key={item.data.id} task={item.data} onClick={() => setPopup(item.data)} />
                      : <PostPlanPill key={item.data.id} plan={item.data} onClick={() => setPostPopup(item.data)} />
                  )}
                  {overflow > 0 && (
                    <button type="button" onClick={e => { e.stopPropagation(); setDayPopover(dateStr) }} className="text-[10px] text-ink-400 hover:text-ink-700 pl-1 text-left transition-colors">
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
          <span className="text-[10px] uppercase tracking-wide text-ink-400 font-medium">Priority:</span>
          {[{ label: 'High', color: '#dc2626' }, { label: 'Medium', color: '#d97706' }, { label: 'Low', color: '#6b7280' }].map(l => (
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

      {dayPopover && (
        <DayPopover dateStr={dayPopover} tasks={tasksByDate[dayPopover] ?? []} postPlans={postsByDate[dayPopover] ?? []} onClose={() => setDayPopover(null)} onTaskClick={t => setPopup(t)} onPostClick={p => setPostPopup(p)} />
      )}
      {popup && <TaskPopup task={popup} onClose={() => setPopup(null)} />}
      {postPopup && <PostPlanPopup plan={postPopup} onClose={() => setPostPopup(null)} onDelete={handleDeletePost} />}
    </div>
  )
}

// ── EventiTab ─────────────────────────────────────────────────────────────────

function EventDetailModal({
  event, onClose, onDelete,
}: { event: UpcomingEventItem; onClose: () => void; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE' })
    if (res.ok) { onDelete(event.id); onClose() }
    else setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex-1">
            {event._source === 'task' && (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 mb-2 inline-block"
                style={{ backgroundColor: event._team ? (TEAM_BADGE[event._team]?.bg ?? '#d97706') : '#d97706', color: '#fff' }}>
                Task · {event._team ?? 'team'}
              </span>
            )}
            <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Data</p>
              <p className="text-ink-900">{fmtDate(event.date)}</p>
            </div>
            {(event.start_time || event.end_time) && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Orario</p>
                <p className="text-ink-900">
                  {event.start_time ?? '—'}{event.end_time ? ` → ${event.end_time}` : ''}
                </p>
              </div>
            )}
            {event.location && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Location</p>
                <p className="text-ink-900">{event.location}</p>
              </div>
            )}
            {event._source !== 'task' && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Status</p>
                <p className="text-ink-900">{event.status}</p>
              </div>
            )}
          </div>
          {event.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Descrizione</p>
              <p className="text-ink-900 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>
        {event._source !== 'task' && (
          <div className="px-6 pb-5 border-t border-[#e5e7eb] pt-3">
            {confirming ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink-500 flex-1">Delete this event?</span>
                <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs font-medium uppercase tracking-wide px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40">
                  {deleting ? '…' : 'Yes, delete'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-ink-900 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-red-600 transition-colors">
                Delete event
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NewEventModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (event: UpcomingEventItem) => void }) {
  const [date, setDate]             = useState('')
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [location, setLocation]     = useState('')
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !title.trim() || saving) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, title: title.trim(), description: description.trim() || null, location: location.trim() || null, start_time: startTime || null, end_time: endTime || null }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setSaving(false); return }
    onCreated(json.data as UpcomingEventItem)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#e5e7eb]">
          <h2 className="font-serif text-xl font-bold text-ink-900">Nuovo evento</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Data *</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Descrizione</label>
            <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="Descrizione (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Ora inizio</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Ora fine</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving || !date || !title.trim()} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Create event'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EventiTab() {
  const today = new Date()
  const [year, setYear]                         = useState(today.getFullYear())
  const [month, setMonth]                       = useState(today.getMonth())
  const [events, setEvents]                     = useState<UpcomingEventItem[]>([])
  const [loading, setLoading]                   = useState(true)
  const [selectedEvent, setSelectedEvent]       = useState<UpcomingEventItem | null>(null)
  const [showCreate, setShowCreate]             = useState(false)
  const [dayPopover, setDayPopover]             = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [evRes, taskRes] = await Promise.all([
        fetch('/api/calendar/events').then(r => r.json()),
        supabase
          .from('tasks')
          .select('id, title, due_date, description, team')
          .eq('is_event', true)
          .not('due_date', 'is', null),
      ])

      const upcoming: UpcomingEventItem[] = (evRes.data ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => ({ ...e, _source: 'event' as const })
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskEvents: UpcomingEventItem[] = ((taskRes.data ?? []) as any[]).map(t => ({
        id: t.id,
        date: t.due_date as string,
        title: t.title as string,
        description: t.description as string | null,
        location: null,
        start_time: null,
        end_time: null,
        status: 'task',
        _source: 'task' as const,
        _team: t.team as string | null,
      }))

      setEvents([...upcoming, ...taskEvents].sort((a, b) => a.date.localeCompare(b.date)))
      setLoading(false)
    }
    load()
  }, [])

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const grid      = useMemo(() => buildGrid(year, month), [year, month])
  const todayStr  = toISODate(today)

  const eventsByDate = useMemo(() => {
    const map: Record<string, UpcomingEventItem[]> = {}
    for (const ev of events) {
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [events])

  if (loading) return <div className="py-16 text-sm text-ink-500">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuovo evento
        </button>
      </div>

      <div className="border border-[#e5e7eb]">
        <div className="grid grid-cols-7 border-b border-[#e5e7eb]">
          {WEEKDAYS.map(d => <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const dateStr   = toISODate(day)
            const isToday   = dateStr === todayStr
            const inMonth   = day.getMonth() === month
            const dayEvs    = eventsByDate[dateStr] ?? []
            const visible   = dayEvs.slice(0, 2)
            const overflow  = dayEvs.length - visible.length
            const isLastRow = i >= 35

            return (
              <div key={dateStr + i} className={['min-h-[96px] p-2 border-b border-r border-[#e5e7eb] flex flex-col gap-1', (i + 1) % 7 === 0 ? 'border-r-0' : '', isLastRow ? 'border-b-0' : ''].join(' ')}>
                <div className="flex-shrink-0">
                  <span className={['inline-flex items-center justify-center w-6 h-6 text-xs font-semibold', isToday ? 'bg-forest text-white' : inMonth ? 'text-ink-900' : 'text-ink-300'].join(' ')}>
                    {day.getDate()}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1">
                  {visible.map(ev => {
                    const isTask = ev._source === 'task'
                    const teamBadge = isTask && ev._team ? (TEAM_BADGE[ev._team] ?? null) : null
                    const bg = isTask ? (teamBadge?.bg ?? '#d97706') : 'var(--forest)'
                    const rawLabel = ev.start_time ? `${ev.start_time} ${ev.title}` : ev.title
                    const label = rawLabel.length > 20 ? rawLabel.slice(0, 20) + '…' : rawLabel
                    return (
                      <button key={ev.id} type="button" onClick={e => { e.stopPropagation(); setSelectedEvent(ev) }}
                        className="w-full text-left text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 truncate flex items-center gap-1"
                        style={{ backgroundColor: bg, color: '#fff' }}>
                        {isTask && <span className="flex-shrink-0 text-[8px] border border-white/60 px-0.5 leading-tight">Task</span>}
                        <span className="truncate">{label}</span>
                      </button>
                    )
                  })}
                  {overflow > 0 && (
                    <button type="button" onClick={e => { e.stopPropagation(); setDayPopover(dateStr) }} className="text-[10px] text-ink-400 hover:text-ink-700 pl-1 text-left transition-colors">
                      +{overflow} altri
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day popover */}
      {dayPopover && (() => {
        const evs = eventsByDate[dayPopover] ?? []
        const dateDisplay = new Date(dayPopover + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) setDayPopover(null) }}>
            <div className="bg-white w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
                <h3 className="font-serif text-lg font-bold text-ink-900">{dateDisplay}</h3>
                <button onClick={() => setDayPopover(null)} className="text-ink-400 hover:text-ink-900 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="px-4 py-3 flex flex-col gap-1 max-h-72 overflow-y-auto">
                {evs.map(ev => {
                  const isTask = ev._source === 'task'
                  const teamBadge = isTask && ev._team ? (TEAM_BADGE[ev._team] ?? null) : null
                  const bg = isTask ? (teamBadge?.bg ?? '#d97706') : 'var(--forest)'
                  return (
                    <button key={ev.id} type="button" onClick={() => { setDayPopover(null); setSelectedEvent(ev) }}
                      className="w-full text-left text-[10px] font-semibold uppercase tracking-wide px-2 py-1.5 flex items-center gap-1.5"
                      style={{ backgroundColor: bg, color: '#fff' }}>
                      {isTask && <span className="text-[8px] border border-white/60 px-0.5 leading-tight flex-shrink-0">Task</span>}
                      <span>{ev.start_time ? `${ev.start_time} ` : ''}{ev.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={id => setEvents(prev => prev.filter(e => e.id !== id))} />
      )}
      {showCreate && (
        <NewEventModal onClose={() => setShowCreate(false)} onCreated={ev => setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)))} />
      )}
    </div>
  )
}

// ── PedTab ────────────────────────────────────────────────────────────────────

function PedDetailModal({
  post, onClose,
}: { post: PedPost; onClose: () => void }) {
  const platformColor = post.platform ? (PLATFORM_COLORS[post.platform] ?? '#1a4a3a') : 'var(--forest)'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex-1">
            {post.platform && (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 mb-2 inline-block" style={{ backgroundColor: platformColor, color: '#fff' }}>
                {post.platform}{post.content_type ? ` · ${post.content_type}` : ''}
              </span>
            )}
            <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug">{post.title}</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Data</p>
              <p className="text-ink-900">{fmtDate(post.scheduled_date)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Status</p>
              <p className="text-ink-900">{post.status}</p>
            </div>
            {post.assigned_to && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Assigned to</p>
                <p className="text-ink-900">{post.assigned_to}</p>
              </div>
            )}
          </div>
          {post.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Descrizione</p>
              <p className="text-ink-900 whitespace-pre-wrap">{post.description}</p>
            </div>
          )}
          {post.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Note</p>
              <p className="text-ink-900 whitespace-pre-wrap">{post.notes}</p>
            </div>
          )}
          {post.attachment_url && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Allegato</p>
              <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" className="text-forest underline text-sm">Visualizza allegato</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NewPedModal({
  existingAssignees, onClose, onCreated,
}: { existingAssignees: string[]; onClose: () => void; onCreated: (post: PedPost) => void }) {
  const [scheduledDate, setDate]    = useState('')
  const [title, setTitle]           = useState('')
  const [platform, setPlatform]     = useState('')
  const [contentType, setContentType] = useState('')
  const [description, setDesc]      = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes]           = useState('')
  const [file, setFile]             = useState<File | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [acOpen, setAcOpen]         = useState(false)

  const acSuggestions = existingAssignees.filter(a => a && a.toLowerCase().includes(assignedTo.toLowerCase()) && a !== assignedTo)

  const availableContentTypes = platform ? (CONTENT_TYPES[platform] ?? []) : []

  function handlePlatformChange(p: string) {
    setPlatform(p)
    setContentType('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledDate || !title.trim() || saving) return
    setSaving(true)
    setError(null)

    let attachmentUrl: string | null = null
    if (file) {
      const supabase = createClient()
      const path = `ped/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const buckets = ['post-plans-attachments', 'admin-archive']
      for (const bucket of buckets) {
        const { data, error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
        if (!upErr && data) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
          attachmentUrl = urlData.publicUrl
          break
        }
      }
    }

    const res = await fetch('/api/ped', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        scheduled_date: scheduledDate,
        platform: platform || null,
        content_type: contentType || null,
        description: description.trim() || null,
        assigned_to: assignedTo.trim() || null,
        notes: notes.trim() || null,
        attachment_url: attachmentUrl,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setSaving(false); return }
    onCreated(json.data as PedPost)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative z-[60] bg-white w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#e5e7eb] flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">Nuova entry PED</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Data *</label>
            <input required type="date" value={scheduledDate} onChange={e => setDate(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Piattaforma</label>
            <div className="relative">
              <select value={platform} onChange={e => handlePlatformChange(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest appearance-none">
                <option value="">Seleziona piattaforma</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </div>
          {platform && availableContentTypes.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Tipo Contenuto</label>
              <div className="relative">
                <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest appearance-none">
                  <option value="">Seleziona tipo</option>
                  {availableContentTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Descrizione</label>
            <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="Descrizione (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none" />
          </div>
          <div className="relative">
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Assigned to</label>
            <input
              value={assignedTo}
              onChange={e => { setAssignedTo(e.target.value); setAcOpen(true) }}
              onFocus={() => setAcOpen(true)}
              onBlur={() => setTimeout(() => setAcOpen(false), 150)}
              placeholder="Nome (opzionale)"
              className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
            {acOpen && acSuggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-[#e5e7eb] shadow-md max-h-32 overflow-y-auto">
                {acSuggestions.map(s => (
                  <button key={s} type="button" onMouseDown={() => { setAssignedTo(s); setAcOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-paper-stone">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Note</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Allegato</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-ink-600 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-medium file:uppercase file:tracking-wide file:bg-forest file:text-white hover:file:bg-[#123a2d]" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving || !scheduledDate || !title.trim()} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Create entry'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PedTab() {
  const today = new Date()
  const [year, setYear]               = useState(today.getFullYear())
  const [month, setMonth]             = useState(today.getMonth())
  const [posts, setPosts]             = useState<PedPost[]>([])
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState<'calendar' | 'list'>('calendar')
  const [selectedPost, setSelectedPost] = useState<PedPost | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [dayPopover, setDayPopover]   = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [confirmDel, setConfirmDel]   = useState<string | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ped')
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(json => setPosts((json.data ?? []) as PedPost[]))
      .finally(() => setLoading(false))
  }, [])

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  const grid     = useMemo(() => buildGrid(year, month), [year, month])
  const todayStr = toISODate(today)

  const postsByDate = useMemo(() => {
    const map: Record<string, PedPost[]> = {}
    for (const p of posts) {
      if (!map[p.scheduled_date]) map[p.scheduled_date] = []
      map[p.scheduled_date].push(p)
    }
    return map
  }, [posts])

  const existingAssignees = useMemo(() =>
    Array.from(new Set(posts.map(p => p.assigned_to).filter(Boolean))) as string[]
  , [posts])

  async function handleStatusChange(id: string, status: string) {
    setUpdatingStatus(id)
    const res = await fetch(`/api/ped/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setUpdatingStatus(null)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/ped/${id}`, { method: 'DELETE' })
    if (res.ok) { setPosts(prev => prev.filter(p => p.id !== id)); setConfirmDel(null) }
    setDeleting(null)
  }

  if (loading) return <div className="py-16 text-sm text-ink-500">Loading...</div>

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          {(['calendar', 'list'] as const).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${view === v ? 'bg-forest text-white border-forest' : 'bg-white text-ink-500 border-[#e5e7eb] hover:border-forest hover:text-ink-900'}`}>
              {v === 'calendar' ? 'Calendario' : 'Lista'}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuova entry
        </button>
      </div>

      {view === 'calendar' ? (
        <>
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
          <div className="border border-[#e5e7eb]">
            <div className="grid grid-cols-7 border-b border-[#e5e7eb]">
              {WEEKDAYS.map(d => <div key={d} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((day, i) => {
                const dateStr   = toISODate(day)
                const isToday   = dateStr === todayStr
                const inMonth   = day.getMonth() === month
                const dayPosts  = postsByDate[dateStr] ?? []
                const visible   = dayPosts.slice(0, 2)
                const overflow  = dayPosts.length - visible.length
                const isLastRow = i >= 35

                return (
                  <div key={dateStr + i} className={['min-h-[96px] p-2 border-b border-r border-[#e5e7eb] flex flex-col gap-1', (i + 1) % 7 === 0 ? 'border-r-0' : '', isLastRow ? 'border-b-0' : ''].join(' ')}>
                    <div className="flex-shrink-0">
                      <span className={['inline-flex items-center justify-center w-6 h-6 text-xs font-semibold', isToday ? 'bg-forest text-white' : inMonth ? 'text-ink-900' : 'text-ink-300'].join(' ')}>
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1">
                      {visible.map(p => {
                        const color = p.platform ? (PLATFORM_COLORS[p.platform] ?? '#1a4a3a') : 'var(--forest)'
                        const label = p.title.length > 20 ? p.title.slice(0, 20) + '…' : p.title
                        return (
                          <button key={p.id} type="button" onClick={e => { e.stopPropagation(); setSelectedPost(p) }}
                            className="w-full text-left text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 truncate"
                            style={{ backgroundColor: color, color: '#fff' }}>
                            {label}
                          </button>
                        )
                      })}
                      {overflow > 0 && (
                        <button type="button" onClick={e => { e.stopPropagation(); setDayPopover(dateStr) }} className="text-[10px] text-ink-400 hover:text-ink-700 pl-1 text-left transition-colors">
                          +{overflow} altri
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Platform legend */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {PLATFORMS.map(p => (
              <span key={p} className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
                <span style={{ backgroundColor: PLATFORM_COLORS[p], width: 8, height: 8, borderRadius: 0, display: 'inline-block', flexShrink: 0 }} />
                {p}
              </span>
            ))}
          </div>

          {/* Day popover */}
          {dayPopover && (() => {
            const ps = postsByDate[dayPopover] ?? []
            const dateDisplay = new Date(dayPopover + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) setDayPopover(null) }}>
                <div className="bg-white w-full max-w-sm shadow-2xl">
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
                    <h3 className="font-serif text-lg font-bold text-ink-900">{dateDisplay}</h3>
                    <button onClick={() => setDayPopover(null)} className="text-ink-400 hover:text-ink-900 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-4 py-3 flex flex-col gap-1 max-h-72 overflow-y-auto">
                    {ps.map(p => {
                      const color = p.platform ? (PLATFORM_COLORS[p.platform] ?? '#1a4a3a') : 'var(--forest)'
                      return (
                        <button key={p.id} type="button" onClick={() => { setDayPopover(null); setSelectedPost(p) }}
                          className="w-full text-left text-[10px] font-semibold uppercase tracking-wide px-2 py-1.5"
                          style={{ backgroundColor: color, color: '#fff' }}>
                          {p.platform ? `[${p.platform}] ` : ''}{p.title}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}
        </>
      ) : (
        /* Lista view */
        <div>
          {posts.length === 0 ? (
            <p className="text-sm text-ink-500 py-8">No entries in the editorial plan.</p>
          ) : (
            <div className="border border-[#e5e7eb]">
              {/* Header row */}
              <div className="grid grid-cols-[120px_1fr_110px_110px_130px_110px_80px] border-b border-[#e5e7eb] bg-[#f9f9f9]">
                {['Date', 'Title', 'Platform', 'Type', 'Assigned to', 'Status', ''].map(h => (
                  <div key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">{h}</div>
                ))}
              </div>
              {posts.map(p => {
                const color = p.platform ? (PLATFORM_COLORS[p.platform] ?? '#1a4a3a') : 'var(--forest)'
                return (
                  <div key={p.id} className="grid grid-cols-[120px_1fr_110px_110px_130px_110px_80px] border-b border-[#e5e7eb] last:border-b-0 hover:bg-paper-cool items-center">
                    <div className="px-3 py-3 text-xs text-ink-600">{fmtDate(p.scheduled_date)}</div>
                    <button type="button" onClick={() => setSelectedPost(p)} className="px-3 py-3 text-sm font-medium text-ink-900 text-left hover:text-forest transition-colors truncate">
                      {p.title}
                    </button>
                    <div className="px-3 py-3">
                      {p.platform ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 text-white" style={{ backgroundColor: color }}>{p.platform}</span>
                      ) : <span className="text-ink-400">—</span>}
                    </div>
                    <div className="px-3 py-3 text-xs text-ink-600">{p.content_type ?? '—'}</div>
                    <div className="px-3 py-3 text-xs text-ink-600 truncate">{p.assigned_to ?? '—'}</div>
                    <div className="px-3 py-3">
                      <div className="relative">
                        <select
                          value={p.status}
                          disabled={updatingStatus === p.id}
                          onChange={e => handleStatusChange(p.id, e.target.value)}
                          className="text-xs font-medium uppercase tracking-wide border border-[#e5e7eb] px-2 py-1 bg-white focus:outline-none focus:border-forest appearance-none pr-5 disabled:opacity-50 w-full"
                        >
                          {PED_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-3 flex items-center justify-end">
                      {confirmDel === p.id ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-[10px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-40">
                            {deleting === p.id ? '…' : 'Yes'}
                          </button>
                          <span className="text-ink-300">/</span>
                          <button type="button" onClick={() => setConfirmDel(null)} className="text-[10px] text-ink-400 hover:text-ink-700">No</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmDel(p.id)} className="p-1 text-ink-300 hover:text-red-500 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedPost && <PedDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {showCreate && (
        <NewPedModal
          existingAssignees={existingAssignees}
          onClose={() => setShowCreate(false)}
          onCreated={post => {
            setPosts(prev => [...prev, post].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)))
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'eventi' | 'ped'>('tasks')

  const TABS = [
    { key: 'tasks'  as const, label: 'Task' },
    { key: 'eventi' as const, label: 'Calendario Eventi' },
    { key: 'ped'    as const, label: 'PED' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Calendario</h1>
      <div className="w-8 h-px bg-forest mb-8" />

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className="pb-2 text-sm font-['Inter'] transition-colors"
              style={
                activeTab === tab.key
                  ? { borderBottom: '2px solid #1a4a3a', color: 'var(--forest)', fontWeight: 600 }
                  : { borderBottom: '2px solid transparent', color: '#6b7280' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'tasks'  && <TasksTab />}
      {activeTab === 'eventi' && <EventiTab />}
      {activeTab === 'ped'    && <PedTab />}
    </div>
  )
}
