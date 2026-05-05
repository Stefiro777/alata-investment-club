'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../../DashboardProfileContext'
import MemberAutocomplete from '../../MemberAutocomplete'
import VenuesSection from '@/components/dashboard/VenuesSection'

// ── HistoryToggle ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoryToggle({ history }: { history: any[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 font-['Inter'] hover:text-black transition-colors"
      >
        <span>Storico modifiche ({history.length})</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="space-y-2 mt-3">
          {history.map(h => (
            <div key={h.id} className="text-xs font-['Inter'] text-gray-600 border-l-2 border-[#1a4a3a] pl-3 py-1">
              <span className="font-semibold text-black">{h.modified_by_name}</span>
              {' '}ha modificato <span className="font-semibold">{h.field_changed}</span>
              <br />
              <span className="text-gray-400">{h.old_value}</span>{' → '}<span className="text-gray-700">{h.new_value}</span>
              <br />
              <span className="text-gray-400">{new Date(h.modified_at).toLocaleString('it-IT')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_NAMES: Record<string, string> = {
  events: 'Events',
  media: 'Media',
  career: 'Career',
  academy: 'Academy',
  syrto: 'Syrto',
  lab: 'Lab & Research',
  alumni: 'Alumni',
}

const STATUS_GROUPS = [
  { key: 'in_progress', label: 'In corso' },
  { key: 'todo',        label: 'To Do' },
  { key: 'done',        label: 'Completate' },
]

const PRIORITY_FILTERS = [
  { key: 'all',    label: 'Tutte' },
  { key: 'high',   label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low',    label: 'Low' },
] as const

type PriorityFilter = 'all' | 'high' | 'medium' | 'low'

const REACTIONS = ['👍', '❤️', '👏', '🦅', '💀', 'CAPORETTO', 'ASSET'] as const
type Reaction = typeof REACTIONS[number]

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; color: string | null }
type Member   = {
  user_id: string
  full_name: string
  role?: string
  teams?: string[] | null
  lab_subdivision?: string | null
}

type Task = {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  category_id: string | null
  assigned_to: string[]
  created_at: string
  completed_at: string | null
  completed_by: string | null
  completer_name: string | null
  category: Category | null
  assignees: Member[]
}

type Comment = {
  id: string
  body: string
  created_at: string
  author_id: string | null
  author_name: string
  reactions: Record<string, string[]>
}

type Goal = {
  id: string
  title: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
  completer_name: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(iso: string | null) {
  if (!iso) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(iso) < today
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function statusLabel(s: string) {
  if (s === 'in_progress') return 'In corso'
  if (s === 'done')        return 'Completata'
  return 'To Do'
}

function statusPill(s: string) {
  if (s === 'in_progress') return 'bg-blue-50 text-blue-700'
  if (s === 'done')        return 'bg-[#1a4a3a]/10 text-[#1a4a3a]'
  return 'bg-black/5 text-ink-500'
}

function priorityLabel(p: string) {
  if (p === 'high') return 'High'
  if (p === 'low')  return 'Low'
  return 'Medium'
}

function priorityBadgeClass(p: string) {
  if (p === 'high') return 'bg-[#7f1d1d] text-white'
  if (p === 'low')  return 'bg-[#374151] text-white'
  return 'bg-[#92400e] text-white'
}

function getQuarterFromDate(date: Date): { q: string; year: number } {
  const m = date.getMonth()
  const q = m < 3 ? 'Q1' : m < 6 ? 'Q2' : m < 9 ? 'Q3' : 'Q4'
  return { q, year: date.getFullYear() }
}

function shiftQuarter(q: string, year: number, delta: number): { q: string; year: number } {
  const qs = ['Q1', 'Q2', 'Q3', 'Q4']
  let idx = qs.indexOf(q) + delta
  let y = year
  while (idx < 0) { idx += 4; y-- }
  while (idx > 3) { idx -= 4; y++ }
  return { q: qs[idx], year: y }
}

function relTime(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)   return 'adesso'
  if (m < 60)  return `${m} min fa`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h fa`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ieri' : `${d} giorni fa`
}

// ── PriorityDropdown ──────────────────────────────────────────────────────────

const PRIORITY_OPTIONS: { value: 'high' | 'medium' | 'low'; label: string; bg: string }[] = [
  { value: 'high',   label: 'High',   bg: '#7f1d1d' },
  { value: 'medium', label: 'Medium', bg: '#92400e' },
  { value: 'low',    label: 'Low',    bg: '#374151' },
]

function PriorityDropdown({
  value,
  onChange,
  disabled,
}: {
  value: 'high' | 'medium' | 'low'
  onChange: (v: 'high' | 'medium' | 'low') => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selected = PRIORITY_OPTIONS.find(o => o.value === value) ?? PRIORITY_OPTIONS[1]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 disabled:opacity-50"
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 text-white"
          style={{ backgroundColor: selected.bg }}
        >
          {selected.label}
        </span>
        <svg className="w-3 h-3 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-line shadow-lg py-1 min-w-[110px]">
          {PRIORITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className="flex items-center w-full px-3 py-1.5 hover:bg-[#f5f5f5]"
            >
              <span
                className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 text-white"
                style={{ backgroundColor: opt.bg }}
              >
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  slug,
  onClick,
  onToggle,
  toggling,
}: {
  task: Task
  slug: string
  onClick: () => void
  onToggle: () => void
  toggling: boolean
}) {
  const overdue = isOverdue(task.due_date)
  const done = task.status === 'done'

  return (
    <div className="flex items-stretch gap-3">
      {/* Checkbox */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle() }}
        disabled={toggling}
        aria-label={done ? 'Segna come non completata' : 'Segna come completata'}
        className={`flex-shrink-0 self-start mt-1 w-4 h-4 border transition-colors disabled:cursor-wait ${
          done
            ? 'bg-[#1a4a3a] border-[#1a4a3a]'
            : 'bg-white border-ink-400 hover:border-[#1a4a3a]'
        }`}
      >
        {done && (
          <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Card body */}
      <button
        type="button"
        onClick={onClick}
        className={`flex-1 text-left border border-line bg-white px-5 py-4 hover:bg-[#f9f9f9] transition-colors ${done ? 'opacity-60' : ''}`}
      >
        {/* Row 1: title */}
        <p className={`text-sm font-semibold leading-snug ${done ? 'line-through text-ink-400' : 'text-ink-900'}`}>
          {task.title}
        </p>

        {/* Completer info (done) */}
        {done && (task.completer_name || task.completed_at) && (
          <p className="text-xs text-ink-400 mt-1">
            Completata
            {task.completer_name ? ` da ${task.completer_name}` : ''}
            {task.completed_at ? ` il ${fmtDate(task.completed_at)}` : ''}
          </p>
        )}

        {/* Row 2: assignees (open tasks only) */}
        {!done && task.assignees.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {task.assignees.slice(0, 3).map((m, i) => (
              <span key={m.user_id} className="text-xs text-ink-600">
                {m.full_name}{i < Math.min(task.assignees.length, 3) - 1 ? ',' : ''}
              </span>
            ))}
            {task.assignees.length > 3 && (
              <span className="text-xs text-ink-400">+{task.assignees.length - 3} altri</span>
            )}
          </div>
        )}

        {/* Row 3: priority + category + due date + status (open tasks only) */}
        {!done && (
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 ${priorityBadgeClass(task.priority)}`}>
              {priorityLabel(task.priority)}
            </span>
            <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 ${statusPill(task.status)}`}>
              {statusLabel(task.status)}
            </span>
            {slug === 'lab' && task.category && (
              <span
                className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5"
                style={{
                  backgroundColor: task.category.color ? `${task.category.color}22` : '#1a4a3a22',
                  color: task.category.color ?? '#1a4a3a',
                }}
              >
                {task.category.name}
              </span>
            )}
            {task.due_date && (
              <span className={`text-[11px] ${overdue ? 'text-red-500 font-semibold' : 'text-ink-400'}`}>
                {overdue ? '⚠ ' : ''}{fmtDate(task.due_date)}
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

// ── TaskModal ─────────────────────────────────────────────────────────────────

function TaskModal({
  task,
  slug,
  canEdit,
  isBoD,
  userId,
  onClose,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onDelete,
  onUpdate,
}: {
  task: Task
  slug: string
  canEdit: boolean
  isBoD: boolean
  userId: string
  onClose: () => void
  onStatusChange: (taskId: string, status: string) => void
  onPriorityChange: (taskId: string, priority: string) => void
  onCategoryChange: (taskId: string, categoryId: string | null, category: Category | null) => void
  onDelete: (taskId: string) => void
  onUpdate: (updated: Task) => void
}) {
  const [comments, setComments]               = useState<Comment[]>([])
  const [loadingCmt, setLoadingCmt]           = useState(true)
  const [newComment, setNewComment]           = useState('')
  const [posting, setPosting]                 = useState(false)
  const [savingStatus, setSavingStatus]       = useState(false)
  const [savingPriority, setSavingPriority]   = useState(false)
  const [savingCat, setSavingCat]             = useState(false)
  const [categories, setCategories]           = useState<Category[]>([])
  const [confirmDel, setConfirmDel]           = useState(false)
  const [deleting, setDeleting]               = useState(false)
  const [confirmDelCmt, setConfirmDelCmt]     = useState<string | null>(null)
  const [deletingCmt, setDeletingCmt]         = useState(false)
  const [isEditing, setIsEditing]             = useState(false)
  const [editTitle, setEditTitle]             = useState(task.title)
  const [editDescription, setEditDescription] = useState(task.description ?? '')
  const [editDueDate, setEditDueDate]         = useState(task.due_date ?? '')
  const [editAssignees, setEditAssignees]     = useState<string[]>(task.assigned_to ?? [])
  const [availableMembers, setAvailableMembers] = useState<{ user_id: string; full_name: string }[]>([])
  const [memberSearch, setMemberSearch]       = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [taskHistory, setTaskHistory]         = useState<any[]>([])
  const [savingEdit, setSavingEdit]           = useState(false)

  useEffect(() => {
    if (slug !== 'lab') return
    createClient()
      .from('task_categories').select('id, name, color').eq('team', 'lab')
      .then(({ data }) => setCategories(data ?? []))
  }, [slug])

  useEffect(() => { loadComments() }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient()
      const { data } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', task.id)
        .order('modified_at', { ascending: false })
      setTaskHistory(data ?? [])

      const { data: mems } = await supabase
        .from('club_members')
        .select('user_id, full_name')
        .order('full_name')
      setAvailableMembers((mems ?? []).filter((m: Record<string, unknown>) => m.user_id) as { user_id: string; full_name: string }[])
    }
    loadHistory()
  }, [task.id])

  async function loadComments() {
    setLoadingCmt(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('task_comments')
      .select('id, content, created_at, author_id, reactions')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })

    const rows = data ?? []
    const uids = [...new Set(rows.map((r: Record<string,unknown>) => r.author_id).filter(Boolean))] as string[]
    let nameMap: Record<string, string> = {}
    if (uids.length) {
      const { data: members } = await supabase
        .from('club_members').select('user_id, full_name').in('user_id', uids)
      ;(members ?? []).forEach((m: Record<string,unknown>) => {
        if (m.user_id) nameMap[m.user_id as string] = m.full_name as string
      })
    }

    setComments(rows.map((r: Record<string,unknown>) => ({
      id: r.id as string,
      body: r.content as string,
      created_at: r.created_at as string,
      author_id: r.author_id as string | null,
      author_name: r.author_id ? (nameMap[r.author_id as string] ?? 'Membro') : 'Membro',
      reactions: (r.reactions as Record<string,string[]>) ?? {},
    })))
    setLoadingCmt(false)
  }

  async function handleComment() {
    const content = newComment.trim()
    if (!content || posting) return
    setPosting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('task_comments')
      .insert({ task_id: task.id, content, author_id: userId })
    if (!error) {
      setNewComment('')
      await loadComments()
    }
    setPosting(false)
  }

  async function handleReaction(commentId: string, reaction: Reaction, currentReactions: Record<string, string[]>) {
    const current = currentReactions[reaction] ?? []
    const hasReacted = current.includes(userId)
    const updated = hasReacted
      ? current.filter(id => id !== userId)
      : [...current, userId]
    const newReactions = { ...currentReactions, [reaction]: updated }
    const supabase = createClient()
    const { error } = await supabase
      .from('task_comments')
      .update({ reactions: newReactions })
      .eq('id', commentId)
    if (!error) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: newReactions } : c))
    }
  }

  async function handleStatusChange(status: string) {
    setSavingStatus(true)
    const supabase = createClient()
    await supabase.from('tasks')
      .update({ status, completed_at: null, completed_by: null })
      .eq('id', task.id)
    onStatusChange(task.id, status)
    setSavingStatus(false)
  }

  async function handlePriorityChange(priority: string) {
    setSavingPriority(true)
    const supabase = createClient()
    await supabase.from('tasks').update({ priority }).eq('id', task.id)
    onPriorityChange(task.id, priority)
    setSavingPriority(false)
  }

  async function handleCategoryChange(categoryId: string) {
    setSavingCat(true)
    const supabase = createClient()
    const id = categoryId || null
    await supabase.from('tasks').update({ category_id: id }).eq('id', task.id)
    const cat = categories.find(c => c.id === id) ?? null
    onCategoryChange(task.id, id, cat)
    setSavingCat(false)
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingCmt(true)
    const supabase = createClient()
    const { error } = await supabase.from('task_comments').delete().eq('id', commentId)
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId))
      setConfirmDelCmt(null)
    }
    setDeletingCmt(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (!error) { onDelete(task.id); onClose() }
    else setDeleting(false)
  }

  async function handleSaveEdit() {
    setSavingEdit(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('club_members')
      .select('full_name')
      .eq('email', user.email!)
      .maybeSingle()
    const authorName = member?.full_name ?? user.email ?? 'Membro'

    const changes: { field_changed: string; old_value: string; new_value: string }[] = []
    if (editTitle !== task.title)
      changes.push({ field_changed: 'Titolo', old_value: task.title, new_value: editTitle })
    if (editDescription !== (task.description ?? ''))
      changes.push({ field_changed: 'Descrizione', old_value: task.description ?? '—', new_value: editDescription || '—' })
    if (editDueDate !== (task.due_date ?? ''))
      changes.push({ field_changed: 'Scadenza', old_value: task.due_date ?? '—', new_value: editDueDate || '—' })
    const oldAssignees = (task.assigned_to ?? []).slice().sort().join(',')
    const newAssignees = editAssignees.slice().sort().join(',')
    if (oldAssignees !== newAssignees)
      changes.push({ field_changed: 'Assegnati', old_value: oldAssignees || '—', new_value: newAssignees || '—' })

    if (changes.length > 0) {
      await supabase.from('tasks').update({
        title: editTitle,
        description: editDescription || null,
        due_date: editDueDate || null,
        assigned_to: editAssignees,
      }).eq('id', task.id)

      await supabase.from('task_history').insert(
        changes.map(c => ({
          task_id: task.id,
          modified_by: user.id,
          modified_by_name: authorName,
          ...c,
        }))
      )

      const newAssigneesResolved = editAssignees.map(uid => {
        const m = availableMembers.find(x => x.user_id === uid)
        return { user_id: uid, full_name: m?.full_name ?? uid }
      })
      onUpdate({ ...task, title: editTitle, description: editDescription || null, due_date: editDueDate || null, assigned_to: editAssignees, assignees: newAssigneesResolved })
      const { data: newHistory } = await supabase
        .from('task_history')
        .select('*')
        .eq('task_id', task.id)
        .order('modified_at', { ascending: false })
      setTaskHistory(newHistory ?? [])
    }
    setIsEditing(false)
    setSavingEdit(false)
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-black/60 pt-16"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-line flex-shrink-0">
          <div className="flex-1">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-xl font-['Cormorant_Garamond',serif] font-semibold text-ink-900 w-full border-b border-[#1a4a3a] focus:outline-none bg-transparent pb-1"
                autoFocus
              />
            ) : (
              <h2 className="text-xl font-['Cormorant_Garamond',serif] font-semibold text-ink-900">{task.title}</h2>
            )}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Status</p>
              {canEdit ? (
                <div className="relative">
                  <select
                    value={task.status}
                    disabled={savingStatus}
                    onChange={e => handleStatusChange(e.target.value)}
                    className="border border-[#1a4a3a] px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In corso</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              ) : (
                <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 ${statusPill(task.status)}`}>
                  {statusLabel(task.status)}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Priorità</p>
              {canEdit ? (
                <PriorityDropdown
                  value={task.priority as 'high' | 'medium' | 'low'}
                  onChange={p => handlePriorityChange(p)}
                  disabled={savingPriority}
                />
              ) : (
                <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 ${priorityBadgeClass(task.priority)}`}>
                  {priorityLabel(task.priority)}
                </span>
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Scadenza</p>
              {isEditing ? (
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="border border-gray-300 px-2 py-1 text-sm font-['Inter'] focus:outline-none focus:border-[#1a4a3a]"
                />
              ) : (
                <p className={task.due_date && isOverdue(task.due_date) ? 'text-red-500 font-semibold' : 'text-ink-900'}>
                  {task.due_date ? fmtDate(task.due_date) : '—'}
                </p>
              )}
            </div>
            {slug === 'lab' && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Divisione</p>
                {canEdit ? (
                  <div className="relative">
                    <select
                      value={task.category_id ?? ''}
                      disabled={savingCat}
                      onChange={e => handleCategoryChange(e.target.value)}
                      className="border border-[#1a4a3a] px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
                    >
                      <option value="">Nessuna</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <p className="text-ink-900">{task.category?.name ?? '—'}</p>
                )}
              </div>
            )}
            <div className="col-span-2">
              {isEditing ? (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Assegnati</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {editAssignees.map(uid => {
                      const m = availableMembers.find(x => x.user_id === uid)
                      return m ? (
                        <span key={uid} className="text-xs border border-[#1a4a3a] px-2 py-0.5 text-[#1a4a3a] flex items-center gap-1">
                          {m.full_name}
                          <button onClick={() => setEditAssignees(prev => prev.filter(id => id !== uid))} className="text-[#1a4a3a] hover:text-black">×</button>
                        </span>
                      ) : null
                    })}
                  </div>
                  <input
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Cerca membro..."
                    className="w-full border border-gray-300 px-3 py-1.5 text-sm font-['Inter'] focus:outline-none focus:border-[#1a4a3a] mb-1"
                  />
                  {memberSearch.length > 0 && (
                    <div className="border border-gray-200 max-h-32 overflow-y-auto">
                      {availableMembers
                        .filter(m => m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) && !editAssignees.includes(m.user_id))
                        .map(m => (
                          <button
                            key={m.user_id}
                            onClick={() => { setEditAssignees(prev => [...prev, m.user_id]); setMemberSearch('') }}
                            className="w-full text-left px-3 py-1.5 text-sm font-['Inter'] hover:bg-[#1a4a3a] hover:text-white transition-colors"
                          >
                            {m.full_name}
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Assegnati</p>
                  {task.assignees.length ? (
                    <div className="flex flex-wrap gap-1">
                      {task.assignees.map(m => (
                        <span key={m.user_id} className="text-xs border border-line px-2 py-0.5 text-ink-700">
                          {m.full_name}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-ink-400">—</p>}
                </>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-1">Descrizione</p>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-[#1a4a3a] resize-none"
                placeholder="Descrizione..."
              />
            ) : (
              task.description ? <p className="text-sm text-ink-700 font-['Inter'] whitespace-pre-wrap">{task.description}</p> : null
            )}
          </div>

          {/* Comments */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-ink-400 mb-3">Commenti</p>
            {loadingCmt ? (
              <p className="text-xs text-ink-400">Caricamento...</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-ink-400">Nessun commento.</p>
            ) : (
              <div className="space-y-4">
                {comments.map(c => (
                  <div key={c.id} className="border border-line px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-ink-900">{c.author_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-ink-400">{relTime(c.created_at)}</span>
                        {(c.author_id === userId || isBoD) && (
                          confirmDelCmt === c.id ? (
                            <>
                              <span className="text-base text-ink-500">Eliminare?</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c.id)}
                                disabled={deletingCmt}
                                className="text-base font-semibold text-red-500 hover:text-red-700 border border-red-300 px-3 py-1 disabled:opacity-40"
                              >
                                {deletingCmt ? '…' : 'Sì'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDelCmt(null)}
                                className="text-base text-ink-400 hover:text-ink-700 border border-line px-3 py-1"
                              >
                                No
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDelCmt(c.id)}
                              className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
                              title="Elimina commento"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {REACTIONS.map(reaction => {
                        const users = c.reactions[reaction] ?? []
                        const active = users.includes(userId)
                        const isText = reaction === 'CAPORETTO' || reaction === 'ASSET'
                        return (
                          <button
                            key={reaction}
                            type="button"
                            onClick={() => handleReaction(c.id, reaction, c.reactions)}
                            className={`flex items-center gap-1 border transition-colors ${
                              isText
                                ? 'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5'
                                : 'text-sm px-2 py-0.5'
                            } ${
                              active
                                ? 'bg-[#1a4a3a] border-[#1a4a3a] text-white'
                                : 'bg-transparent border-line text-ink-500 hover:border-[#1a4a3a] hover:text-ink-900'
                            }`}
                          >
                            <span>{reaction}</span>
                            {users.length > 0 && (
                              <span className="text-[10px] font-medium">{users.length}</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Scrivi un commento..."
                rows={3}
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleComment}
                  disabled={posting || !newComment.trim()}
                  className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-5 py-2 transition-colors disabled:opacity-40"
                >
                  {posting ? 'Invio…' : 'Commenta'}
                </button>
              </div>
            </div>
          </div>

          {/* History */}
          {taskHistory.length > 0 && <HistoryToggle history={taskHistory} />}

          {/* Delete — bod/director only */}
          {canEdit && (
            <div className="flex items-center gap-3 pt-2 border-t border-line flex-shrink-0">
              {isEditing ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsEditing(false); setEditTitle(task.title); setEditDescription(task.description ?? ''); setEditDueDate(task.due_date ?? '') }}
                    className="text-sm text-gray-500 font-['Inter'] hover:text-black"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="text-sm text-[#1a4a3a] font-semibold font-['Inter'] hover:underline disabled:opacity-50"
                  >
                    {savingEdit ? 'Salvataggio...' : 'Salva modifiche'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-[#1a4a3a] font-['Inter'] hover:underline"
                >
                  Modifica task
                </button>
              )}
              {!isEditing && (
                <>
                  {confirmDel ? (
                    <>
                      <span className="text-sm text-ink-500">Sei sicuro?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
                      >
                        {deleting ? '…' : 'Sì, elimina'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDel(false)}
                        className="text-sm text-ink-400 hover:text-ink-700"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDel(true)}
                      className="text-xs font-medium uppercase tracking-wide text-red-400 hover:text-red-600 transition-colors"
                    >
                      Elimina task
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CreateTaskModal ───────────────────────────────────────────────────────────

function CreateTaskModal({
  slug,
  userId,
  onClose,
  onCreated,
}: {
  slug: string
  userId: string
  onClose: () => void
  onCreated: (task: Task) => void
}) {
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [dueDate, setDueDate]       = useState('')
  const [categoryId, setCatId]      = useState('')
  const [priority, setPriority]     = useState<'high' | 'medium' | 'low'>('medium')
  const [selectedUids, setSelected] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [members, setMembers]       = useState<Member[]>([])
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    async function loadForm() {
      const supabase = createClient()
      const { data: mems } = await supabase.from('club_members').select('user_id, full_name, role, teams, lab_subdivision').order('full_name')
      setMembers((mems ?? []).filter((m: Record<string,unknown>) => m.user_id).map((m: Record<string,unknown>) => ({
        user_id: m.user_id as string,
        full_name: m.full_name as string,
        role: m.role as string | undefined,
        teams: m.teams as string[] | null | undefined,
        lab_subdivision: m.lab_subdivision as string | null | undefined,
      })))
      if (slug === 'lab') {
        const { data: cats } = await supabase.from('task_categories').select('id, name, color').eq('team', 'lab')
        setCategories(cats ?? [])
      }
    }
    loadForm()
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        category_id: categoryId || null,
        assigned_to: selectedUids,
        team: slug,
        status: 'todo',
        priority,
        created_by: userId,
      })
      .select('id, title, description, status, priority, due_date, category_id, assigned_to, created_at')
      .single()

    if (!error && data) {
      const r = data as Record<string, unknown>
      console.log('task creata:', r)

      // Fire-and-forget: notify assignees by email
      fetch(`${window.location.origin}/api/tasks/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: r.id }),
      })
        .then(res => res.json())
        .then(data => console.log('notify response:', data))
        .catch(err => console.log('notify error:', err))

      const cat = categories.find(c => c.id === categoryId) ?? null
      const assignees = members.filter(m => selectedUids.includes(m.user_id))
      onCreated({
        id: r.id as string,
        title: r.title as string,
        description: r.description as string | null,
        status: r.status as string,
        priority: r.priority as string,
        due_date: r.due_date as string | null,
        category_id: r.category_id as string | null,
        assigned_to: r.assigned_to as string[],
        created_at: r.created_at as string,
        category: cat,
        assignees,
        completed_at: null,
        completed_by: null,
        completer_name: null,
      })
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">Nuova task</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Titolo *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo task"
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Descrizione</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Descrizione..."
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none"
            />
          </div>

          <div className={`grid gap-4 ${slug === 'lab' ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Scadenza</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
            {slug === 'lab' && (
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Divisione</label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={e => setCatId(e.target.value)}
                    className="border border-[#1a4a3a] px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
                  >
                    <option value="">Nessuna</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Priorità</label>
            <PriorityDropdown value={priority} onChange={setPriority} />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-2">Assegnati</label>
            <MemberAutocomplete
              members={members}
              selectedUids={selectedUids}
              onChange={setSelected}
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40"
            >
              {saving ? 'Creazione…' : 'Crea task'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── GoalsSection ──────────────────────────────────────────────────────────────

function GoalsSection({
  slug,
  canEdit,
  isBoD,
  userId,
  userName,
}: {
  slug: string
  canEdit: boolean
  isBoD: boolean
  userId: string
  userName: string | null
}) {
  const current = getQuarterFromDate(new Date())

  const [viewQ, setViewQ]                   = useState(current.q)
  const [viewYear, setViewYear]             = useState(current.year)
  const [goals, setGoals]                   = useState<Goal[]>([])
  const [loadingGoals, setLoadingGoals]     = useState(true)
  const [newTitle, setNewTitle]             = useState('')
  const [adding, setAdding]                 = useState(false)
  const [showAddForm, setShowAddForm]       = useState(false)
  const [toggling, setToggling]             = useState<string | null>(null)
  const [confirmDelGoal, setConfirmDelGoal] = useState<string | null>(null)
  const [deletingGoal, setDeletingGoal]     = useState<string | null>(null)

  useEffect(() => {
    async function loadGoals() {
      setLoadingGoals(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('team_goals')
        .select('id, title, completed, completed_at, completed_by, created_at')
        .eq('team', slug)
        .eq('quarter', viewQ)
        .eq('year', viewYear)
        .order('created_at', { ascending: true })

      const rows = data ?? []
      const completerIds = [...new Set(
        rows.map((r: Record<string, unknown>) => r.completed_by).filter(Boolean)
      )] as string[]
      let nameMap: Record<string, string> = {}
      if (completerIds.length) {
        const { data: members } = await supabase
          .from('club_members').select('user_id, full_name').in('user_id', completerIds)
        ;(members ?? []).forEach((m: Record<string, unknown>) => {
          if (m.user_id) nameMap[m.user_id as string] = m.full_name as string
        })
      }

      setGoals(rows.map((r: Record<string, unknown>) => ({
        id: r.id as string,
        title: r.title as string,
        completed: r.completed as boolean,
        completed_at: (r.completed_at as string) ?? null,
        completed_by: (r.completed_by as string) ?? null,
        completer_name: r.completed_by ? (nameMap[r.completed_by as string] ?? null) : null,
        created_at: r.created_at as string,
      })))
      setLoadingGoals(false)
    }
    loadGoals()
  }, [slug, viewQ, viewYear])

  async function handleToggle(goal: Goal) {
    if (toggling || !canEdit) return
    setToggling(goal.id)
    const supabase = createClient()
    const nowCompleted = !goal.completed
    const update = nowCompleted
      ? { completed: true, completed_at: new Date().toISOString(), completed_by: userId }
      : { completed: false, completed_at: null, completed_by: null }
    const { error } = await supabase.from('team_goals').update(update).eq('id', goal.id)
    if (!error) {
      setGoals(prev => prev.map(g => g.id !== goal.id ? g : {
        ...g,
        completed: nowCompleted,
        completed_at: nowCompleted ? new Date().toISOString() : null,
        completed_by: nowCompleted ? userId : null,
        completer_name: nowCompleted ? userName : null,
      }))
    }
    setToggling(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || adding) return
    setAdding(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('team_goals')
      .insert({ team: slug, quarter: viewQ, year: viewYear, title, completed: false, created_by: userId })
      .select('id, title, completed, completed_at, completed_by, created_at')
      .single()
    if (!error && data) {
      const r = data as Record<string, unknown>
      setGoals(prev => [...prev, {
        id: r.id as string,
        title: r.title as string,
        completed: false,
        completed_at: null,
        completed_by: null,
        completer_name: null,
        created_at: r.created_at as string,
      }])
      setNewTitle('')
    }
    setAdding(false)
  }

  async function handleDelete(goalId: string) {
    setDeletingGoal(goalId)
    const supabase = createClient()
    const { error } = await supabase.from('team_goals').delete().eq('id', goalId)
    if (!error) setGoals(prev => prev.filter(g => g.id !== goalId))
    setConfirmDelGoal(null)
    setDeletingGoal(null)
  }

  function navigate(delta: number) {
    const next = shiftQuarter(viewQ, viewYear, delta)
    setViewQ(next.q)
    setViewYear(next.year)
  }

  const doneCount  = goals.filter(g => g.completed).length
  const total      = goals.length
  const pct        = total === 0 ? 0 : Math.round((doneCount / total) * 100)
  const isCurrent  = viewQ === current.q && viewYear === current.year

  return (
    <section className="mb-2">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-2xl font-semibold text-ink-900">Goals</h2>
          <span className="text-sm text-ink-400 font-medium">— {viewQ} {viewYear}</span>
        </div>

        {/* Quarter navigation */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors"
            title="Quarter precedente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {!isCurrent && (
            <button
              type="button"
              onClick={() => { setViewQ(current.q); setViewYear(current.year) }}
              className="text-xs text-[#1a4a3a] hover:underline underline-offset-2 px-1.5 py-1"
            >
              Oggi
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(1)}
            className="p-1.5 text-ink-400 hover:text-ink-900 transition-colors"
            title="Quarter successivo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Goals list */}
      {loadingGoals ? (
        <p className="text-sm text-ink-400 py-2">Caricamento...</p>
      ) : (
        <div className="mb-4 space-y-1">
          {goals.length === 0 && !canEdit && (
            <p className="text-sm text-ink-500 py-1">Nessun goal per questo quarter.</p>
          )}

          {goals.map(goal => (
            <div key={goal.id} className="flex items-start gap-3 py-2">
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => handleToggle(goal)}
                disabled={!canEdit || toggling === goal.id}
                aria-label={goal.completed ? 'Segna come non completato' : 'Segna come completato'}
                className={`flex-shrink-0 mt-0.5 w-4 h-4 border transition-colors disabled:cursor-wait ${
                  canEdit ? '' : 'cursor-default'
                } ${
                  goal.completed
                    ? 'bg-[#1a4a3a] border-[#1a4a3a]'
                    : 'bg-white border-ink-400 hover:border-[#1a4a3a]'
                }`}
              >
                {goal.completed && (
                  <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${goal.completed ? 'line-through text-ink-400' : 'text-ink-900 font-medium'}`}>
                  {goal.title}
                </p>
                {goal.completed && goal.completed_at && (
                  <p className="text-xs text-ink-400 mt-0.5">
                    {fmtDate(goal.completed_at)}{goal.completer_name ? ` · ${goal.completer_name}` : ''}
                  </p>
                )}
              </div>

              {/* Delete (BoD only) */}
              {isBoD && (
                <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
                  {confirmDelGoal === goal.id ? (
                    <>
                      <span className="text-base text-ink-500">Eliminare?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(goal.id)}
                        disabled={deletingGoal === goal.id}
                        className="text-base font-semibold text-red-500 hover:text-red-700 border border-red-300 px-3 py-1 disabled:opacity-40"
                      >
                        {deletingGoal === goal.id ? '…' : 'Sì'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelGoal(null)}
                        className="text-base text-ink-400 hover:text-ink-700 border border-line px-3 py-1"
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelGoal(goal.id)}
                      className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
                      title="Elimina goal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add goal */}
          {canEdit && (
            showAddForm ? (
              <form onSubmit={handleAdd} className="flex gap-2 pt-1">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Nuovo goal..."
                  className="flex-1 border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
                />
                <button
                  type="submit"
                  disabled={adding || !newTitle.trim()}
                  className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-4 py-2 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {adding ? '…' : 'Aggiungi'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewTitle('') }}
                  className="text-sm text-ink-400 hover:text-ink-900 px-2"
                >
                  Annulla
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-[#1a4a3a] transition-colors pt-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Aggiungi goal
              </button>
            )
          )}
        </div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="mb-2">
          <div className="h-[6px] w-full bg-[#e5e7eb]">
            <div
              className="h-full bg-[#1a4a3a] transition-all duration-500 ease-in-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-ink-400 mt-1.5">{doneCount}/{total} completati ({pct}%)</p>
        </div>
      )}

      {/* Divider */}
      <div className="mt-8 border-t border-line" />
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const params = useParams()
  const slug = (params.slug as string) ?? ''
  const profile  = useProfile()

  const [tasks, setTasks]               = useState<Task[]>([])
  const [loading, setLoading]           = useState(true)
  const [userId, setUserId]             = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate]     = useState(false)
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set(['done']))
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [togglingTask, setTogglingTask] = useState<string | null>(null)

  const teamName = TEAM_NAMES[slug] ?? slug
  const canEdit  = profile?.role === 'bod' || profile?.role === 'director'
  const canView  = profile?.role === 'bod' || profile?.role === 'director' || !!profile?.teams?.includes(slug)

  const loadTasks = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, category_id, assigned_to, created_at, completed_at, completed_by, task_categories(id, name, color)')
      .eq('team', slug)
      .order('due_date', { ascending: true, nullsFirst: false })

    const rows = taskRows ?? []
    const allUids = Array.from(new Set([
      ...rows.flatMap((r: Record<string,unknown>) => (r.assigned_to as string[] | null) ?? []),
      ...rows.map((r: Record<string,unknown>) => r.completed_by).filter(Boolean) as string[],
    ]))

    let memberMap: Record<string, Member> = {}
    if (allUids.length) {
      const { data: mems } = await supabase
        .from('club_members').select('user_id, full_name').in('user_id', allUids)
      ;(mems ?? []).forEach((m: Record<string,unknown>) => {
        if (m.user_id) memberMap[m.user_id as string] = { user_id: m.user_id as string, full_name: m.full_name as string }
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: Task[] = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      status: r.status,
      priority: r.priority ?? 'medium',
      due_date: r.due_date ?? null,
      category_id: r.category_id ?? null,
      assigned_to: r.assigned_to ?? [],
      created_at: r.created_at,
      completed_at: r.completed_at ?? null,
      completed_by: r.completed_by ?? null,
      completer_name: r.completed_by ? (memberMap[r.completed_by]?.full_name ?? null) : null,
      category: r.task_categories ?? null,
      assignees: (r.assigned_to ?? []).map((uid: string) => memberMap[uid]).filter(Boolean),
    }))

    setTasks(parsed)
    setLoading(false)
  }, [slug])

  useEffect(() => { loadTasks() }, [loadTasks])

  function handleStatusChange(taskId: string, status: string) {
    const patch = { status, completed_at: null as string | null, completed_by: null as string | null, completer_name: null as string | null }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...patch } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, ...patch } : prev)
  }

  async function handleToggleDone(task: Task) {
    if (togglingTask || !userId) return
    setTogglingTask(task.id)
    const supabase = createClient()
    const nowDone = task.status !== 'done'
    const completedAt = nowDone ? new Date().toISOString() : null
    const update = nowDone
      ? { status: 'done', completed_at: completedAt, completed_by: userId }
      : { status: 'todo', completed_at: null, completed_by: null }
    const { error } = await supabase.from('tasks').update(update).eq('id', task.id)
    if (!error) {
      const patch = {
        status: update.status,
        completed_at: completedAt,
        completed_by: nowDone ? userId : null,
        completer_name: nowDone ? (profile?.full_name ?? null) : null,
      }
      setTasks(prev => prev.map(t => t.id !== task.id ? t : { ...t, ...patch }))
      if (selectedTask?.id === task.id) setSelectedTask(prev => prev ? { ...prev, ...patch } : prev)
    }
    setTogglingTask(null)
  }

  function handlePriorityChange(taskId: string, priority: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, priority } : prev)
  }

  function handleCategoryChange(taskId: string, categoryId: string | null, category: Category | null) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, category_id: categoryId, category } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, category_id: categoryId, category } : prev)
  }

  function handleUpdate(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    setSelectedTask(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  function toggleGroup(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Guards ───────────────────────────────────────────────────────────────────

  if (profile && !canView) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-20 text-center">
        <p className="font-serif text-2xl text-ink-900">Non hai accesso a questo team</p>
        <p className="text-sm text-ink-500 mt-2">Contatta un BoD per richiedere l&apos;accesso.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-sm text-ink-500">Caricamento...</div>
    )
  }

  const filteredTasks = priorityFilter === 'all'
    ? tasks
    : tasks.filter(t => t.priority === priorityFilter)

  const totalMembers = Array.from(new Set(tasks.flatMap(t => t.assigned_to))).length

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">
            Team {teamName}
          </h1>
          <div className="w-8 h-px bg-forest mb-3" />
          <p className="text-sm text-ink-500">
            {tasks.length} task · {totalMembers} membri coinvolti
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuova task
          </button>
        )}
      </div>

      {/* Goals section */}
      {userId && (
        <GoalsSection
          slug={slug}
          canEdit={canEdit}
          isBoD={profile?.role === 'bod' || profile?.role === 'director'}
          userId={userId}
          userName={profile?.full_name ?? null}
        />
      )}

      {/* Priority filter */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-2 mb-8">
          {PRIORITY_FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setPriorityFilter(f.key)}
              className={`text-xs font-medium uppercase tracking-wide px-4 py-1.5 border transition-colors ${
                priorityFilter === f.key
                  ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                  : 'bg-white text-ink-500 border-line hover:border-[#1a4a3a] hover:text-ink-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Task groups */}
      {filteredTasks.length === 0 ? (
        <p className="text-sm text-ink-500">
          {tasks.length === 0 ? 'Nessuna task per questo team.' : 'Nessuna task con questa priorità.'}
        </p>
      ) : (
        <div className="space-y-8">
          {STATUS_GROUPS.map(group => {
            const groupTasks = filteredTasks.filter(t => t.status === group.key)
            if (groupTasks.length === 0) return null
            const isCollapsed = collapsed.has(group.key)

            return (
              <div key={group.key}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center gap-3 mb-4 group"
                >
                  <h2 className="font-serif text-xl font-semibold text-ink-900 group-hover:text-forest transition-colors">
                    {group.label}
                  </h2>
                  <span className="text-xs text-ink-400">{groupTasks.length}</span>
                  <svg
                    className="w-4 h-4 text-ink-400 transition-transform duration-200"
                    style={{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <div style={{ display: 'grid', gridTemplateRows: isCollapsed ? '0fr' : '1fr', transition: 'grid-template-rows 0.2s ease' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div className="space-y-2 pb-1">
                      {groupTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          slug={slug}
                          onClick={() => setSelectedTask(task)}
                          onToggle={() => handleToggleDone(task)}
                          toggling={togglingTask === task.id}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Venues — solo per team events */}
      {slug === 'events' && <VenuesSection />}

      {/* Task detail modal */}
      {selectedTask && userId && (
        <TaskModal
          task={selectedTask}
          slug={slug}
          canEdit={canEdit}
          isBoD={profile?.role === 'bod' || profile?.role === 'director'}
          userId={userId}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleStatusChange}
          onPriorityChange={handlePriorityChange}
          onCategoryChange={handleCategoryChange}
          onDelete={taskId => { setTasks(prev => prev.filter(t => t.id !== taskId)); setSelectedTask(null) }}
          onUpdate={handleUpdate}
        />
      )}

      {/* Create task modal */}
      {showCreate && userId && (
        <CreateTaskModal
          slug={slug}
          userId={userId}
          onClose={() => setShowCreate(false)}
          onCreated={task => { setTasks(prev => [task, ...prev]); setShowCreate(false) }}
        />
      )}

    </div>
  )
}
