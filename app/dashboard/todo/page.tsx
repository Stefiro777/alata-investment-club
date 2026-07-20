'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'
import MemberAutocomplete from '../MemberAutocomplete'

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
            <div key={h.id} className="text-xs font-['Inter'] text-gray-600 border-l-2 border-forest pl-3 py-1">
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

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  user_id: string
  full_name: string
  role?: string
  teams?: string[] | null
  lab_subdivision?: string | null
}

type TodoTask = {
  id: string
  title: string
  status: string
  created_at: string
  created_by: string | null
  completed_at: string | null
  completed_by: string | null
  due_date: string | null
  creator_name: string | null
  completer_name: string | null
  assigned_to: string[]
  assignees: Member[]
  recurrence_type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | null
  recurrence_interval: number | null
  recurrence_days: number[] | null
  recurrence_end_date: string | null
  recurrence_parent_id: string | null
  recurrence_exceptions: string[] | null
  _is_virtual?: boolean
  _recurrence_origin_id?: string
  _recurrence_date?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

// ── Quarter helpers ───────────────────────────────────────────────────────────

function getQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const q = Math.floor(d.getMonth() / 3) + 1
  return `Q${q} ${d.getFullYear()}`
}

function getCurrentQuarterLabel(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `Q${q} ${now.getFullYear()}`
}

function groupByQuarter(tasks: TodoTask[]): { label: string; tasks: TodoTask[] }[] {
  const map = new Map<string, TodoTask[]>()
  for (const t of tasks) {
    const label = t.due_date ? getQuarterLabel(t.due_date) : t.created_at ? getQuarterLabel(t.created_at) : getCurrentQuarterLabel()
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(t)
  }
  return Array.from(map.entries()).map(([label, tasks]) => ({ label, tasks }))
}

// ── Recurrence helpers ────────────────────────────────────────────────────────

function getQuarterRange(): { start: Date; end: Date } {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const year = now.getFullYear()
  const start = new Date(year, q * 3, 1)
  const end = new Date(year, q * 3 + 3, 0)
  return { start, end }
}

function nextOccurrence(current: Date, task: TodoTask, interval: number): Date {
  const next = new Date(current)
  switch (task.recurrence_type) {
    case 'daily':
      next.setDate(next.getDate() + interval)
      break
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      break
    case 'custom':
      next.setDate(next.getDate() + 7 * interval)
      break
  }
  return next
}

function generateOccurrences(task: TodoTask, start: Date, end: Date): Date[] {
  const dates: Date[] = []
  if (!task.due_date) return dates

  const origin = new Date(task.due_date)
  const recEnd = task.recurrence_end_date ? new Date(task.recurrence_end_date) : end
  const effectiveEnd = recEnd < end ? recEnd : end

  const interval = task.recurrence_interval ?? 1
  let cursor = new Date(origin)

  while (cursor < start) {
    cursor = nextOccurrence(cursor, task, interval)
  }

  let safety = 0
  while (cursor <= effectiveEnd && safety < 500) {
    safety++
    if (cursor >= start) {
      dates.push(new Date(cursor))
    }
    cursor = nextOccurrence(cursor, task, interval)
  }

  return dates
}

function expandRecurringTasks(tasks: TodoTask[]): TodoTask[] {
  const { start, end } = getQuarterRange()
  const result: TodoTask[] = []

  for (const task of tasks) {
    if (!task.recurrence_type) {
      result.push(task)
      continue
    }

    const occurrences = generateOccurrences(task, start, end)
    for (const date of occurrences) {
      const dateStr = date.toISOString().split('T')[0]
      if (task.recurrence_exceptions?.includes(dateStr)) continue
      result.push({
        ...task,
        id: `${task.id}__${dateStr}`,
        due_date: dateStr,
        _is_virtual: true,
        _recurrence_origin_id: task.id,
        _recurrence_date: dateStr,
      })
    }
  }

  return result.sort((a, b) => {
    if (!a.due_date) return 1
    if (!b.due_date) return -1
    return a.due_date.localeCompare(b.due_date)
  })
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TodoPage() {
  const profile = useProfile()

  const [tasks, setTasks]               = useState<TodoTask[]>([])
  const [members, setMembers]           = useState<Member[]>([])
  const [loading, setLoading]           = useState(true)
  const [newTitle, setNewTitle]         = useState('')
  const [selectedUids, setSelectedUids] = useState<string[]>([])
  const [adding, setAdding]             = useState(false)
  const [toggling, setToggling]         = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [editingTask, setEditingTask]   = useState<TodoTask | null>(null)
  const [editTitle, setEditTitle]       = useState('')
  const [editStatus, setEditStatus]     = useState('')
  const [editDueDate, setEditDueDate]   = useState('')
  const [editAssignees, setEditAssignees] = useState<string[]>([])
  const [availableMembers, setAvailableMembers] = useState<{user_id: string, full_name: string}[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editHistory, setEditHistory]   = useState<any[]>([])
  const [saving, setSaving]             = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // New task recurrence states
  const [newRecurrenceType, setNewRecurrenceType]     = useState<string>('')
  const [newRecurrenceInterval, setNewRecurrenceInterval] = useState<number>(1)
  const [newRecurrenceEndDate, setNewRecurrenceEndDate] = useState<string>('')
  const [newDueDate, setNewDueDate]                   = useState<string>('')

  // Edit modal recurrence states
  const [editRecurrenceType, setEditRecurrenceType]     = useState<string>('')
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState<number>(1)
  const [editRecurrenceEndDate, setEditRecurrenceEndDate] = useState<string>('')

  // Occurrences modal
  const [occurrencesTask, setOccurrencesTask] = useState<TodoTask | null>(null)

  // Recurrence toggle dialog
  const [recurrenceToggleDialog, setRecurrenceToggleDialog] = useState<{
    task: TodoTask & { _recurrence_origin_id: string; _recurrence_date: string }
    nowDone: boolean
  } | null>(null)

  const [showDone, setShowDone] = useState(false)

  const isDone   = (t: TodoTask) => t.status === 'done'
  const displayTasks = expandRecurringTasks(tasks)
  const open     = displayTasks.filter(t => !isDone(t))
  const done     = displayTasks.filter(t => isDone(t))
  const openGroups = groupByQuarter(open)
  const doneGroups = groupByQuarter(done)
  const canEdit  = profile?.role === 'bod' || profile?.role === 'director'

  useEffect(() => {
    if (!profile) return
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadTasks() {
    const supabase = createClient()

    const { data: memberRows } = await supabase
      .from('club_members')
      .select('user_id, full_name, role, teams, lab_subdivision')
      .not('user_id', 'is', null)
      .order('full_name')

    const loadedMembers: Member[] = (memberRows ?? [])
      .filter((m: Record<string, unknown>) => m.user_id)
      .map((m: Record<string, unknown>) => ({
        user_id: m.user_id as string,
        full_name: m.full_name as string,
        role: m.role as string | undefined,
        teams: m.teams as string[] | null | undefined,
        lab_subdivision: m.lab_subdivision as string | null | undefined,
      }))

    setMembers(loadedMembers)
    setAvailableMembers(loadedMembers.filter(m => m.user_id))

    const memberMap: Record<string, string> = {}
    loadedMembers.forEach(m => { memberMap[m.user_id] = m.full_name })

    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, created_by, completed_at, completed_by, due_date, assigned_to, recurrence_type, recurrence_interval, recurrence_days, recurrence_end_date, recurrence_parent_id, recurrence_exceptions')
      .eq('is_todo_item', true)
      .order('created_at', { ascending: true })

    if (!taskRows) { setLoading(false); return }

    const parsed: TodoTask[] = taskRows.map((r: Record<string, unknown>) => {
      const assignedTo = (r.assigned_to as string[] | null) ?? []
      return {
        id: r.id as string,
        title: r.title as string,
        status: r.status as string,
        created_at: r.created_at as string,
        created_by: r.created_by as string | null,
        completed_at: r.completed_at as string | null,
        completed_by: r.completed_by as string | null,
        due_date: r.due_date as string | null,
        creator_name: r.created_by ? (memberMap[r.created_by as string] ?? null) : null,
        completer_name: r.completed_by ? (memberMap[r.completed_by as string] ?? null) : null,
        assigned_to: assignedTo,
        assignees: assignedTo.map(uid => loadedMembers.find(m => m.user_id === uid)).filter(Boolean) as Member[],
        recurrence_type: r.recurrence_type as TodoTask['recurrence_type'],
        recurrence_interval: r.recurrence_interval as number | null,
        recurrence_days: r.recurrence_days as number[] | null,
        recurrence_end_date: r.recurrence_end_date as string | null,
        recurrence_parent_id: r.recurrence_parent_id as string | null,
        recurrence_exceptions: r.recurrence_exceptions as string[] | null,
      }
    })

    setTasks(parsed)
    setLoading(false)
  }

  async function handleToggle(task: TodoTask) {
    if (toggling) return

    if (task._is_virtual) {
      setRecurrenceToggleDialog({
        task: task as TodoTask & { _recurrence_origin_id: string; _recurrence_date: string },
        nowDone: !isDone(task),
      })
      return
    }

    setToggling(task.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToggling(null); return }

    const nowDone = !isDone(task)
    const update = nowDone
      ? { status: 'done', completed_at: new Date().toISOString(), completed_by: user.id }
      : { status: 'todo', completed_at: null, completed_by: null }

    const { error } = await supabase.from('tasks').update(update).eq('id', task.id)
    if (!error) {
      setTasks(prev => prev.map(t => t.id !== task.id ? t : {
        ...t,
        status: update.status,
        completed_at: 'completed_at' in update ? (update.completed_at ?? null) : t.completed_at,
        completed_by: 'completed_by' in update ? (update.completed_by ?? null) : t.completed_by,
        completer_name: nowDone ? (profile?.full_name ?? null) : null,
      }))
    }
    setToggling(null)
  }

  async function handleToggleThisOnly() {
    if (!recurrenceToggleDialog) return
    const { task, nowDone } = recurrenceToggleDialog
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('tasks').update({
      recurrence_exceptions: [
        ...(tasks.find(t => t.id === task._recurrence_origin_id)?.recurrence_exceptions ?? []),
        task._recurrence_date,
      ],
    }).eq('id', task._recurrence_origin_id)

    await supabase.from('tasks').insert({
      title: task.title,
      is_todo_item: true,
      status: nowDone ? 'done' : 'todo',
      created_by: user.id,
      assigned_to: task.assigned_to,
      due_date: task._recurrence_date,
      recurrence_parent_id: task._recurrence_origin_id,
      completed_at: nowDone ? new Date().toISOString() : null,
      completed_by: nowDone ? user.id : null,
    })

    setRecurrenceToggleDialog(null)
    await loadTasks()
  }

  async function handleToggleThisAndFuture() {
    if (!recurrenceToggleDialog) return
    const { task } = recurrenceToggleDialog
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const originTask = tasks.find(t => t.id === task._recurrence_origin_id)
    if (!originTask) return

    const dayBefore = new Date(task._recurrence_date)
    dayBefore.setDate(dayBefore.getDate() - 1)

    await supabase.from('tasks').update({
      recurrence_end_date: dayBefore.toISOString().split('T')[0],
    }).eq('id', task._recurrence_origin_id)

    setRecurrenceToggleDialog(null)
    await loadTasks()
  }

  async function handleDelete(taskId: string) {
    setDeleting(taskId)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) setTasks(prev => prev.filter(t => t.id !== taskId))
    setConfirmDelete(null)
    setDeleting(null)
  }

  async function openEdit(task: TodoTask) {
    // Edit the origin task if virtual
    const originId = task._recurrence_origin_id ?? task.id
    const origin = tasks.find(t => t.id === originId) ?? task
    setEditingTask(origin)
    setEditTitle(origin.title)
    setEditStatus(origin.status)
    setEditDueDate(origin.due_date ?? '')
    setEditAssignees(origin.assigned_to ?? [])
    setEditRecurrenceType(origin.recurrence_type ?? '')
    setEditRecurrenceInterval(origin.recurrence_interval ?? 1)
    setEditRecurrenceEndDate(origin.recurrence_end_date ?? '')
    const supabase = createClient()
    const { data } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', originId)
      .order('modified_at', { ascending: false })
    setEditHistory(data ?? [])
  }

  async function handleSaveEdit() {
    if (!editingTask) return
    setSaving(true)
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
    if (editTitle !== editingTask.title)
      changes.push({ field_changed: 'Titolo', old_value: editingTask.title, new_value: editTitle })
    if (editStatus !== editingTask.status)
      changes.push({ field_changed: 'Stato', old_value: editingTask.status, new_value: editStatus })
    if (editDueDate !== (editingTask.due_date ?? ''))
      changes.push({ field_changed: 'Scadenza', old_value: editingTask.due_date ?? '—', new_value: editDueDate || '—' })

    const oldA = (editingTask.assigned_to ?? []).slice().sort().join(',')
    const newA = editAssignees.slice().sort().join(',')
    if (oldA !== newA)
      changes.push({ field_changed: 'Assegnati', old_value: oldA || '—', new_value: newA || '—' })

    const oldRT = editingTask.recurrence_type ?? ''
    if (editRecurrenceType !== oldRT)
      changes.push({ field_changed: 'Ricorrenza', old_value: oldRT || '—', new_value: editRecurrenceType || '—' })
    if (editRecurrenceType && editRecurrenceInterval !== (editingTask.recurrence_interval ?? 1))
      changes.push({ field_changed: 'Intervallo ricorrenza', old_value: String(editingTask.recurrence_interval ?? 1), new_value: String(editRecurrenceInterval) })
    if (editRecurrenceEndDate !== (editingTask.recurrence_end_date ?? ''))
      changes.push({ field_changed: 'Fine ricorrenza', old_value: editingTask.recurrence_end_date ?? '—', new_value: editRecurrenceEndDate || '—' })

    if (changes.length > 0) {
      await supabase.from('tasks').update({
        title: editTitle,
        status: editStatus,
        due_date: editDueDate || null,
        assigned_to: editAssignees,
        recurrence_type: editRecurrenceType || null,
        recurrence_interval: editRecurrenceType ? editRecurrenceInterval : null,
        recurrence_end_date: editRecurrenceEndDate || null,
      }).eq('id', editingTask.id)

      await supabase.from('task_history').insert(
        changes.map(c => ({
          task_id: editingTask.id,
          modified_by: user.id,
          modified_by_name: authorName,
          ...c,
        }))
      )

      setTasks(prev => prev.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              title: editTitle,
              status: editStatus as TodoTask['status'],
              due_date: editDueDate || null,
              assigned_to: editAssignees,
              assignees: editAssignees.map(uid => members.find(m => m.user_id === uid)).filter(Boolean) as Member[],
              recurrence_type: (editRecurrenceType || null) as TodoTask['recurrence_type'],
              recurrence_interval: editRecurrenceType ? editRecurrenceInterval : null,
              recurrence_end_date: editRecurrenceEndDate || null,
            }
          : t
      ))
    }
    setSaving(false)
    setEditingTask(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || adding) return

    setAdding(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAdding(false); return }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        is_todo_item: true,
        status: 'todo',
        created_by: user.id,
        assigned_to: selectedUids,
        due_date: newDueDate || null,
        recurrence_type: newRecurrenceType || null,
        recurrence_interval: newRecurrenceType ? newRecurrenceInterval : null,
        recurrence_end_date: newRecurrenceEndDate || null,
      })
      .select('id, title, status, created_at, created_by, completed_at, completed_by, due_date, assigned_to, recurrence_type, recurrence_interval, recurrence_days, recurrence_end_date, recurrence_parent_id, recurrence_exceptions')
      .single()

    if (!error && data) {
      const row = data as Record<string, unknown>
      const assignedTo = (row.assigned_to as string[] | null) ?? []
      setTasks(prev => [...prev, {
        id: row.id as string,
        title: row.title as string,
        status: row.status as string,
        created_at: row.created_at as string,
        created_by: row.created_by as string | null,
        completed_at: null,
        completed_by: null,
        due_date: row.due_date as string | null,
        creator_name: profile?.full_name ?? null,
        completer_name: null,
        assigned_to: assignedTo,
        assignees: assignedTo.map(uid => members.find(m => m.user_id === uid)).filter(Boolean) as Member[],
        recurrence_type: row.recurrence_type as TodoTask['recurrence_type'],
        recurrence_interval: row.recurrence_interval as number | null,
        recurrence_days: row.recurrence_days as number[] | null,
        recurrence_end_date: row.recurrence_end_date as string | null,
        recurrence_parent_id: row.recurrence_parent_id as string | null,
        recurrence_exceptions: row.recurrence_exceptions as string[] | null,
      }])
      fetch(`${window.location.origin}/api/tasks/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: row.id }),
      }).catch(() => {})
      setNewTitle('')
      setSelectedUids([])
      setNewRecurrenceType('')
      setNewRecurrenceInterval(1)
      setNewRecurrenceEndDate('')
      setNewDueDate('')
      inputRef.current?.focus()
    }
    setAdding(false)
  }

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (profile && profile.role === 'member') {
    return (
      <div className="max-w-2xl mx-auto px-8 py-20 text-center">
        <p className="font-serif text-2xl text-ink-900">Accesso non autorizzato</p>
        <p className="text-sm text-ink-500 mt-2">Questa pagina è riservata a BoD e Director.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-8 py-16 text-sm text-ink-500">
        Caricamento...
      </div>
    )
  }

  return (
    <>
    <div className="max-w-2xl mx-auto px-8 py-10">

      {/* Header */}
      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-4">To Do</h1>
      <div className="w-8 h-px bg-forest mb-8" />

      {/* Add form */}
      <form onSubmit={handleAdd} className="space-y-3 mb-10">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Nuova to do..."
            className="flex-1 border border-line px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
          />
          <button
            type="submit"
            disabled={adding || !newTitle.trim()}
            className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {adding ? '…' : 'Aggiungi'}
          </button>
        </div>

        {/* Assignees autocomplete */}
        <MemberAutocomplete
          members={members}
          selectedUids={selectedUids}
          onChange={setSelectedUids}
        />

        {/* Due date */}
        <input
          type="date"
          value={newDueDate}
          onChange={e => setNewDueDate(e.target.value)}
          className="w-full border border-line px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
        />

        {/* Ricorrenza */}
        <div className="relative">
          <select
            value={newRecurrenceType}
            onChange={e => setNewRecurrenceType(e.target.value)}
            className="border border-forest px-3 py-2.5 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
          >
            <option value="">Nessuna ricorrenza</option>
            <option value="daily">Giornaliera</option>
            <option value="weekly">Settimanale</option>
            <option value="monthly">Mensile</option>
            <option value="yearly">Annuale</option>
            <option value="custom">Personalizzata</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {newRecurrenceType === 'custom' && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-500 font-['Inter']">Ogni</span>
            <input
              type="number"
              min={1}
              value={newRecurrenceInterval}
              onChange={e => setNewRecurrenceInterval(Number(e.target.value))}
              className="w-16 border border-line px-3 py-2 text-sm focus:outline-none focus:border-forest"
            />
            <span className="text-sm text-ink-500 font-['Inter']">settimane</span>
          </div>
        )}

        {newRecurrenceType && (
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Fine ricorrenza (opzionale)</label>
            <input
              type="date"
              value={newRecurrenceEndDate}
              onChange={e => setNewRecurrenceEndDate(e.target.value)}
              className="w-full border border-line px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>
        )}
      </form>

      {/* TO DO */}
      {open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-ink-500">Nessuna to do al momento.</p>
      ) : (
        <div className="mb-10">
          {openGroups.map(group => (
            <div key={group.label} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs uppercase tracking-widest text-forest font-['Inter'] font-semibold">{group.label}</span>
                <div className="flex-1 h-px bg-forest/20" />
              </div>
              <div className="border border-line">
                {group.tasks.map(task => (
                  <TodoRow
                    key={task.id}
                    task={task}
                    toggling={toggling === task.id}
                    onToggle={() => handleToggle(task)}
                    canDelete={canEdit}
                    confirmingDelete={confirmDelete === task.id}
                    deleting={deleting === task.id}
                    onDeleteRequest={() => setConfirmDelete(task.id)}
                    onConfirmDelete={() => handleDelete(task._recurrence_origin_id ? task._recurrence_origin_id : task.id)}
                    onCancelDelete={() => setConfirmDelete(null)}
                    onEditRequest={() => openEdit(task)}
                    onShowOccurrences={task.recurrence_type ? () => {
                      const origin = tasks.find(t => t.id === (task._recurrence_origin_id ?? task.id)) ?? task
                      setOccurrencesTask(origin)
                    } : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* COMPLETATE */}
      {done.length > 0 && (
        <div className="mt-6 border-t border-line pt-6">
          <button
            onClick={() => setShowDone(o => !o)}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 font-['Inter'] hover:text-black transition-colors mb-4"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showDone ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            Completate ({done.length})
          </button>

          {showDone && (
            <div className="space-y-8">
              {doneGroups.map(group => (
                <div key={group.label}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs uppercase tracking-widest text-gray-400 font-['Inter'] font-semibold">{group.label}</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="border border-line">
                    {group.tasks.map(task => (
                      <TodoRow
                        key={task.id}
                        task={task}
                        toggling={toggling === task.id}
                        onToggle={() => handleToggle(task)}
                        canDelete={canEdit}
                        confirmingDelete={confirmDelete === task.id}
                        deleting={deleting === task.id}
                        onDeleteRequest={() => setConfirmDelete(task.id)}
                        onConfirmDelete={() => handleDelete(task._recurrence_origin_id ? task._recurrence_origin_id : task.id)}
                        onCancelDelete={() => setConfirmDelete(null)}
                        onEditRequest={() => openEdit(task)}
                        onShowOccurrences={task.recurrence_type ? () => {
                          const origin = tasks.find(t => t.id === (task._recurrence_origin_id ?? task.id)) ?? task
                          setOccurrencesTask(origin)
                        } : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>

    {/* Edit modal */}
    {editingTask && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="bg-forest px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-['Cormorant_Garamond',serif] text-xl tracking-wide">Modifica Task</h2>
            <button onClick={() => setEditingTask(null)} className="text-white hover:text-gray-300 text-xl">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Titolo */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Titolo</label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
              />
            </div>

            {/* Stato */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Stato</label>
              <div className="relative">
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="border border-forest px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
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
            </div>

            {/* Scadenza */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Scadenza</label>
              <input
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
              />
            </div>

            {/* Ricorrenza */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Ricorrenza</label>
              <div className="relative">
                <select
                  value={editRecurrenceType}
                  onChange={e => setEditRecurrenceType(e.target.value)}
                  className="border border-forest px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
                >
                  <option value="">Nessuna ricorrenza</option>
                  <option value="daily">Giornaliera</option>
                  <option value="weekly">Settimanale</option>
                  <option value="monthly">Mensile</option>
                  <option value="yearly">Annuale</option>
                  <option value="custom">Personalizzata</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {editRecurrenceType === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-ink-500 font-['Inter']">Ogni</span>
                  <input
                    type="number"
                    min={1}
                    value={editRecurrenceInterval}
                    onChange={e => setEditRecurrenceInterval(Number(e.target.value))}
                    className="w-16 border border-gray-300 px-3 py-1.5 text-sm font-['Inter'] focus:outline-none focus:border-forest"
                  />
                  <span className="text-sm text-ink-500 font-['Inter']">settimane</span>
                </div>
              )}

              {editRecurrenceType && (
                <div className="mt-2">
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Fine ricorrenza (opzionale)</label>
                  <input
                    type="date"
                    value={editRecurrenceEndDate}
                    onChange={e => setEditRecurrenceEndDate(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
                  />
                </div>
              )}
            </div>

            {/* Assegnati */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Assegnati</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {editAssignees.map(uid => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const m = availableMembers.find((x: any) => x.user_id === uid)
                  return m ? (
                    <span key={uid} className="text-xs border border-forest px-2 py-0.5 text-forest flex items-center gap-1 font-['Inter']">
                      {m.full_name}
                      <button onClick={() => setEditAssignees(prev => prev.filter(id => id !== uid))} className="text-forest hover:text-black">×</button>
                    </span>
                  ) : null
                })}
              </div>
              <input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Cerca membro..."
                className="w-full border border-gray-300 px-3 py-1.5 text-sm font-['Inter'] focus:outline-none focus:border-forest mb-1"
              />
              {memberSearch.length > 0 && (
                <div className="border border-gray-200 max-h-32 overflow-y-auto">
                  {availableMembers
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((m: any) => m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) && !editAssignees.includes(m.user_id))
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((m: any) => (
                      <button
                        key={m.user_id}
                        onClick={() => { setEditAssignees(prev => [...prev, m.user_id]); setMemberSearch('') }}
                        className="w-full text-left px-3 py-1.5 text-sm font-['Inter'] hover:bg-forest hover:text-white transition-colors"
                      >
                        {m.full_name}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Bottoni */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-600 font-['Inter'] hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 text-sm bg-forest text-white font-['Inter'] hover:bg-[#143d2f] disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>

            {/* Storico modifiche */}
            {editHistory.length > 0 && <HistoryToggle history={editHistory} />}

          </div>
        </div>
      </div>
    )}

    {/* Occurrences modal */}
    {occurrencesTask && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm">
          <div className="bg-forest px-6 py-4 flex items-center justify-between">
            <h2 className="text-white font-['Cormorant_Garamond',serif] text-xl tracking-wide">Prossime occorrenze</h2>
            <button onClick={() => setOccurrencesTask(null)} className="text-white hover:text-gray-300 text-xl">✕</button>
          </div>
          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-['Inter']">{occurrencesTask.title}</p>
            <div className="space-y-1">
              {(() => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const futureEnd = new Date()
                futureEnd.setFullYear(futureEnd.getFullYear() + 1)
                const all = generateOccurrences(occurrencesTask, today, futureEnd)
                  .filter(d => !(occurrencesTask.recurrence_exceptions ?? []).includes(d.toISOString().split('T')[0]))
                  .slice(0, 10)
                if (all.length === 0) return <p className="text-sm text-gray-400 font-['Inter']">Nessuna occorrenza futura.</p>
                return all.map((d, i) => (
                  <div key={i} className="text-sm font-['Inter'] text-ink-900 border-l-2 border-forest pl-3 py-0.5">
                    {formatDate(d.toISOString())}
                  </div>
                ))
              })()}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Recurrence toggle dialog */}
    {recurrenceToggleDialog && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm">
          <div className="bg-forest px-6 py-4">
            <h2 className="text-white font-['Cormorant_Garamond',serif] text-xl tracking-wide">
              {recurrenceToggleDialog.nowDone ? 'Completa ricorrenza' : 'Riapri ricorrenza'}
            </h2>
          </div>
          <div className="px-6 py-5 space-y-3">
            <p className="text-sm font-['Inter'] text-ink-700">Vuoi modificare solo questa occorrenza o questa e tutte le future?</p>
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={handleToggleThisOnly}
                className="w-full text-left px-4 py-3 border border-forest text-sm font-['Inter'] text-forest hover:bg-forest hover:text-white transition-colors"
              >
                Solo questa occorrenza
              </button>
              <button
                onClick={handleToggleThisAndFuture}
                className="w-full text-left px-4 py-3 border border-forest text-sm font-['Inter'] text-forest hover:bg-forest hover:text-white transition-colors"
              >
                Questa e tutte le future
              </button>
              <button
                onClick={() => setRecurrenceToggleDialog(null)}
                className="w-full text-left px-4 py-3 border border-gray-200 text-sm font-['Inter'] text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function TodoRow({
  task,
  toggling,
  onToggle,
  canDelete,
  confirmingDelete,
  deleting,
  onDeleteRequest,
  onConfirmDelete,
  onCancelDelete,
  onEditRequest,
  onShowOccurrences,
}: {
  task: TodoTask
  toggling: boolean
  onToggle: () => void
  canDelete: boolean
  confirmingDelete: boolean
  deleting: boolean
  onDeleteRequest: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onEditRequest: () => void
  onShowOccurrences?: () => void
}) {
  const done = task.status === 'done'

  return (
    <div className={`flex items-start gap-4 px-5 py-4 border-b border-line last:border-b-0 transition-opacity ${done ? 'opacity-50' : ''}`}>

      {/* Checkbox — negative margin balances the added padding so the visible
          16×16 square keeps its exact position/size while the real tap area grows to 44×44. */}
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling}
        aria-label={done ? 'Segna come da fare' : 'Segna come completata'}
        className="flex-shrink-0 -m-3.5 p-3.5 disabled:cursor-wait"
      >
        <span className={`block mt-0.5 w-4 h-4 border transition-colors ${
          done
            ? 'bg-forest border-forest'
            : 'bg-white border-ink-400 hover:border-forest'
        }`}>
          {done && (
            <svg className="w-full h-full text-white" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${done ? 'line-through text-ink-400' : 'text-ink-900 font-medium'}`}>
          {task.title}
          {task.recurrence_type && (
            <span
              title="Task ricorrente"
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-forest border border-forest px-1.5 py-px ml-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/>
                <polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              Ricorrente
            </span>
          )}
          {task.recurrence_type && onShowOccurrences && (
            <button
              onClick={onShowOccurrences}
              className="text-[10px] text-forest underline underline-offset-2 ml-1 font-['Inter']"
            >
              Vedi prossime
            </button>
          )}
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
          {task.creator_name && (
            <span className="text-[11px] text-ink-400">Creata da {task.creator_name}</span>
          )}
          {task.due_date && !done && (
            <span className="text-[11px] text-ink-400">Scade il {formatDate(task.due_date)}</span>
          )}
          {done && task.completed_at && (
            <span className="text-[11px] text-ink-400">
              Completata il {formatDate(task.completed_at)}
              {task.completer_name ? ` da ${task.completer_name}` : ''}
            </span>
          )}
        </div>

        {/* Assignee badges */}
        {task.assignees.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {task.assignees.map(m => (
              <span
                key={m.user_id}
                className="text-xs border border-forest px-2 py-0.5 text-forest font-['Inter']"
              >
                {m.full_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Delete controls */}
      {canDelete && (
        <div className="flex-shrink-0 flex items-center gap-2 mt-0.5">
          {confirmingDelete ? (
            <>
              <span className="text-base text-ink-500">Sei sicuro?</span>
              <button
                type="button"
                onClick={onConfirmDelete}
                disabled={deleting}
                className="text-base font-semibold text-red-500 hover:text-red-700 border border-red-300 px-3 py-1 disabled:opacity-40"
              >
                Sì
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="text-base text-ink-400 hover:text-ink-700 border border-line px-3 py-1"
              >
                No
              </button>
            </>
          ) : (
            <>
              {/* Edit/Delete — padding-only growth (no negative margin) so the flex
                  gap-2 between them stays real empty space, guaranteeing >=8px
                  clearance between the two enlarged tap areas. */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditRequest() }}
                aria-label="Modifica task"
                className="text-forest hover:text-black transition-colors p-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={onDeleteRequest}
                aria-label="Elimina task"
                className="text-ink-300 hover:text-red-400 transition-colors p-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

    </div>
  )
}
