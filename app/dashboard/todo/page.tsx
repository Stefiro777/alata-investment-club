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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editHistory, setEditHistory]   = useState<any[]>([])
  const [saving, setSaving]             = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isDone   = (t: TodoTask) => t.status === 'done'
  const open     = tasks.filter(t => !isDone(t))
  const done     = tasks.filter(t => isDone(t))
  const canEdit  = profile?.role === 'bod' || profile?.role === 'director'

  useEffect(() => {
    if (!profile) return
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  async function loadTasks() {
    const supabase = createClient()

    // Load all members (for dropdown + name resolution)
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

    const memberMap: Record<string, string> = {}
    loadedMembers.forEach(m => { memberMap[m.user_id] = m.full_name })

    // Load tasks
    const { data: taskRows } = await supabase
      .from('tasks')
      .select('id, title, status, created_at, created_by, completed_at, completed_by, due_date, assigned_to')
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
      }
    })

    setTasks(parsed)
    setLoading(false)
  }

  async function handleToggle(task: TodoTask) {
    if (toggling) return
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

  async function handleDelete(taskId: string) {
    setDeleting(taskId)
    const supabase = createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) setTasks(prev => prev.filter(t => t.id !== taskId))
    setConfirmDelete(null)
    setDeleting(null)
  }

  async function openEdit(task: TodoTask) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditStatus(task.status)
    setEditDueDate(task.due_date ?? '')
    const supabase = createClient()
    const { data } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', task.id)
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

    if (changes.length > 0) {
      await supabase.from('tasks').update({
        title: editTitle,
        status: editStatus,
        due_date: editDueDate || null,
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
          ? { ...t, title: editTitle, status: editStatus as TodoTask['status'], due_date: editDueDate || null }
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
      })
      .select('id, title, status, created_at, created_by, completed_at, completed_by, due_date, assigned_to')
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
      }])
      fetch(`${window.location.origin}/api/tasks/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: row.id }),
      }).catch(() => {})
      setNewTitle('')
      setSelectedUids([])
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

  const total     = tasks.length
  const doneCount = done.length

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
            className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40 whitespace-nowrap"
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
      </form>

      {/* Task list */}
      {open.length === 0 && done.length === 0 ? (
        <p className="text-sm text-ink-500">Nessuna to do al momento.</p>
      ) : (
        <div className="border border-line">
          {[...open, ...done].map(task => (
            <TodoRow
              key={task.id}
              task={task}
              toggling={toggling === task.id}
              onToggle={() => handleToggle(task)}
              canDelete={canEdit}
              confirmingDelete={confirmDelete === task.id}
              deleting={deleting === task.id}
              onDeleteRequest={() => setConfirmDelete(task.id)}
              onConfirmDelete={() => handleDelete(task.id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onEditRequest={() => openEdit(task)}
            />
          ))}
        </div>
      )}

      {/* Counter */}
      {total > 0 && (
        <p className="text-xs text-ink-400 mt-5">
          {doneCount} task completate su {total} totali
        </p>
      )}

    </div>

    {/* Edit modal */}
    {editingTask && (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto">

          {/* Header */}
          <div className="bg-[#1a4a3a] px-6 py-4 flex items-center justify-between">
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
                className="w-full border border-gray-300 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-[#1a4a3a]"
              />
            </div>

            {/* Stato */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Stato</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full border border-[#1a4a3a] px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-[#1a4a3a] bg-white text-black"
              >
                <option value="todo">Todo</option>
                <option value="in_progress">In corso</option>
                <option value="done">Fatto</option>
              </select>
            </div>

            {/* Scadenza */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Scadenza</label>
              <input
                type="date"
                value={editDueDate}
                onChange={e => setEditDueDate(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-[#1a4a3a]"
              />
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
                className="px-4 py-2 text-sm bg-[#1a4a3a] text-white font-['Inter'] hover:bg-[#143d2f] disabled:opacity-50"
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
}) {
  const done = task.status === 'done'

  return (
    <div className={`flex items-start gap-4 px-5 py-4 border-b border-line last:border-b-0 transition-opacity ${done ? 'opacity-50' : ''}`}>

      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        disabled={toggling}
        aria-label={done ? 'Segna come da fare' : 'Segna come completata'}
        className={`flex-shrink-0 mt-0.5 w-4 h-4 border transition-colors disabled:cursor-wait ${
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

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${done ? 'line-through text-ink-400' : 'text-ink-900 font-medium'}`}>
          {task.title}
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
                title={m.full_name}
                className="w-5 h-5 bg-[#1a4a3a] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0"
              >
                {initials(m.full_name)}
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
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditRequest() }}
                aria-label="Modifica task"
                className="text-[#1a4a3a] hover:text-black transition-colors"
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
                className="text-ink-300 hover:text-red-400 transition-colors p-1.5"
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
