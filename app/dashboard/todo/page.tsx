'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'
import MemberAutocomplete from '../MemberAutocomplete'

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = { user_id: string; full_name: string }

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
      .select('user_id, full_name')
      .not('user_id', 'is', null)
      .order('full_name')

    const loadedMembers: Member[] = (memberRows ?? [])
      .filter((m: Record<string, unknown>) => m.user_id)
      .map((m: Record<string, unknown>) => ({
        user_id: m.user_id as string,
        full_name: m.full_name as string,
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
          )}
        </div>
      )}

    </div>
  )
}
