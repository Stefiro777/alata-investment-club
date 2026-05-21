'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_OPTIONS = [
  { key: 'events',    label: 'Events' },
  { key: 'media',     label: 'Media' },
  { key: 'career',    label: 'Career' },
  { key: 'education', label: 'Education' },
  { key: 'academy',   label: 'Academy' },
  { key: 'syrto',     label: 'Syrto' },
  { key: 'lab',       label: 'Lab' },
  { key: 'alumni',    label: 'Alumni' },
]

const LAB_SUBDIVISIONS = [
  { key: 'macro_markets',    label: 'Macro & Markets' },
  { key: 'equity_valuation', label: 'Equity Valuation' },
  { key: 'ma',               label: 'M&A' },
]

const ROLE_OPTIONS = [
  { key: 'bod',       label: 'BoD' },
  { key: 'director',  label: 'Management' },
  { key: 'member',    label: 'Membro' },
]

const ROLE_GROUPS = [
  { key: 'bod',      label: 'Board of Directors' },
  { key: 'director', label: 'Management' },
  { key: 'member',   label: 'Membri' },
]

function roleGroupLabel(role: string): string {
  return ROLE_GROUPS.find(r => r.key === role)?.label ?? role
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getQuarter(date: string): { q: string; year: number } {
  const d = new Date(date)
  const month = d.getMonth() + 1
  const year = d.getFullYear()
  if (month <= 3) return { q: 'Q1', year }
  if (month <= 6) return { q: 'Q2', year }
  if (month <= 9) return { q: 'Q3', year }
  return { q: 'Q4', year }
}

function currentQuarterInfo(): { q: string; year: number } {
  return getQuarter(new Date().toISOString())
}

function lastName(name: string): string {
  return name.trim().split(' ').slice(-1)[0].toLowerCase()
}

function teamLabel(key: string): string {
  return TEAM_OPTIONS.find(t => t.key === key)?.label ?? key
}

function labSubLabel(key: string): string {
  return LAB_SUBDIVISIONS.find(l => l.key === key)?.label ?? key
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id: string
  user_id?: string | null
  full_name: string
  email: string | null
  phone: string | null
  role: string
  title: string | null
  teams: string[] | null
  lab_subdivision: string | null
}

type TaskRecord = {
  id: string
  title: string
  team: string | null
  status: string
  completed_at: string | null
  assigned_to: string[]
}

type FormState = {
  full_name: string
  email: string
  phone: string
  role: string
  title: string
  teams: string[]
  lab_subdivision: string
  user_id?: string | null
}

const EMPTY_FORM: FormState = {
  full_name: '',
  email: '',
  phone: '',
  role: 'member',
  title: '',
  teams: [],
  lab_subdivision: '',
  user_id: null,
}

// ── CompletedTasksModal ───────────────────────────────────────────────────────

function TaskRow({ task }: { task: TaskRecord }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-line last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-900 leading-snug">{task.title}</p>
        {task.completed_at && (
          <p className="text-xs text-ink-400 mt-0.5">{formatDate(task.completed_at)}</p>
        )}
      </div>
      {task.team && (
        <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-[#1a4a3a] text-white">
          {teamLabel(task.team)}
        </span>
      )}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="w-4 h-4 text-ink-400 transition-transform duration-150 flex-shrink-0"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function CompletedTasksModal({
  memberName,
  tasks,
  onClose,
}: {
  memberName: string
  tasks: TaskRecord[]
  onClose: () => void
}) {
  const curQ = currentQuarterInfo()
  const curKey = `${curQ.q} ${curQ.year}`

  const currentTasks = tasks.filter(t =>
    t.completed_at && (q => q.q === curQ.q && q.year === curQ.year)(getQuarter(t.completed_at))
  )

  // Past tasks grouped by quarter, most recent first (tasks already sorted DESC)
  const pastGroups: { key: string; label: string; tasks: TaskRecord[] }[] = []
  const seen = new Set<string>()
  for (const t of tasks) {
    if (!t.completed_at) continue
    const q = getQuarter(t.completed_at)
    const key = `${q.q} ${q.year}`
    if (key === curKey) continue
    if (!seen.has(key)) {
      seen.add(key)
      pastGroups.push({ key, label: key, tasks: [] })
    }
    pastGroups.find(g => g.key === key)!.tasks.push(t)
  }

  const [pastOpen, setPastOpen] = useState(false)
  const [openQuarters, setOpenQuarters] = useState<Set<string>>(new Set())

  function toggleQuarter(key: string) {
    setOpenQuarters(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <div>
            <h2 className="font-serif text-xl font-bold text-ink-900">Task completate</h2>
            <p className="text-sm text-ink-500 mt-0.5">{memberName}</p>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Current quarter */}
          <div className="px-7 pt-5 pb-4">
            <h3 className="font-serif text-lg font-semibold text-ink-900 mb-3">{curKey}</h3>
            {currentTasks.length === 0 ? (
              <p className="text-sm text-ink-500">Nessuna task completata questo quarter.</p>
            ) : (
              <div>{currentTasks.map(t => <TaskRow key={t.id} task={t} />)}</div>
            )}
          </div>

          {/* Past quarters accordion */}
          {pastGroups.length > 0 && (
            <div className="border-t border-line">
              <button
                type="button"
                onClick={() => setPastOpen(v => !v)}
                className="w-full flex items-center justify-between px-7 py-4 text-left hover:bg-[#f9f9f9] transition-colors"
              >
                <span className="text-sm font-medium text-ink-700">Task precedenti</span>
                <ChevronIcon open={pastOpen} />
              </button>

              {pastOpen && (
                <div className="border-t border-line">
                  {pastGroups.map(group => (
                    <div key={group.key} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => toggleQuarter(group.key)}
                        className="w-full flex items-center justify-between px-7 py-3 text-left hover:bg-[#f9f9f9] transition-colors"
                      >
                        <span className="text-sm text-ink-700">
                          {group.label}{' '}
                          <span className="text-ink-400">({group.tasks.length})</span>
                        </span>
                        <ChevronIcon open={openQuarters.has(group.key)} />
                      </button>
                      {openQuarters.has(group.key) && (
                        <div className="px-7 border-t border-line">
                          {group.tasks.map(t => <TaskRow key={t.id} task={t} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── MemberForm modal ──────────────────────────────────────────────────────────

function MemberFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: (Member & { isNew: boolean }) | null
  onClose: () => void
  onSaved: (member: Member, isNew: boolean) => void
}) {
  const isNew = initial?.isNew ?? true
  const [form, setForm] = useState<FormState>(() =>
    initial && !initial.isNew
      ? {
          full_name: initial.full_name,
          email: initial.email ?? '',
          phone: initial.phone ?? '',
          role: initial.role,
          title: initial.title ?? '',
          teams: initial.teams ?? [],
          lab_subdivision: initial.lab_subdivision ?? '',
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleTeam(key: string) {
    setForm(f => {
      const next = f.teams.includes(key)
        ? f.teams.filter(t => t !== key)
        : [...f.teams, key]
      // clear lab_subdivision if lab deselected
      return { ...f, teams: next, lab_subdivision: next.includes('lab') ? f.lab_subdivision : '' }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    setError(null)

    const payload = {
      full_name:       form.full_name.trim(),
      email:           form.email.trim() || null,
      phone:           form.phone.trim() || null,
      role:            form.role,
      title:           form.title.trim() || null,
      teams:           form.teams.length ? form.teams : null,
      lab_subdivision: form.teams.includes('lab') && form.lab_subdivision ? form.lab_subdivision : null,
    }

    const supabase = createClient()
    if (isNew) {
      const { data, error: err } = await supabase
        .from('club_members')
        .insert(payload)
        .select('id, user_id, full_name, email, phone, role, title, teams, lab_subdivision')
        .maybeSingle()
      if (err || !data) { setError(err?.message ?? 'Errore'); setSaving(false); return }
      onSaved(data as Member, true)
    } else {
      const { data, error: err } = await supabase
        .from('club_members')
        .update(payload)
        .eq('id', initial!.id)
        .select('id, user_id, full_name, email, phone, role, title, teams, lab_subdivision')
        .maybeSingle()
      console.log('UPDATE error:', err)
      console.log('UPDATE data:', data)
      if (err || !data) { setError(err?.message ?? 'Errore'); setSaving(false); return }
      onSaved(data as Member, false)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">
            {isNew ? 'Aggiungi membro' : 'Modifica membro'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Nome completo *</label>
            <input
              required
              value={form.full_name}
              onChange={e => setField('full_name', e.target.value)}
              placeholder="Nome Cognome"
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="nome@esempio.com"
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Telefono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+39 000 000 0000"
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          {/* Role + Title */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Ruolo</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={e => setField('role', e.target.value)}
                  className="border border-[#1a4a3a] bg-white text-black font-['Inter'] text-sm w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1a4a3a] appearance-none"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option
                      key={r.key}
                      value={r.key}
                      className={r.key === form.role ? 'bg-[#1a4a3a] text-white' : 'bg-white text-black'}
                    >
                      {r.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Titolo</label>
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="es. Head of Events"
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          {/* Teams */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-2">
              Team ({form.teams.length} selezionati)
            </label>
            <div className="grid grid-cols-2 gap-1 border border-line p-3">
              {TEAM_OPTIONS.map(t => (
                <label key={t.key} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.teams.includes(t.key)}
                    onChange={() => toggleTeam(t.key)}
                    className="accent-[#1a4a3a] w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-ink-900">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Lab subdivision — only when lab is selected */}
          {form.teams.includes('lab') && (
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Divisione Lab</label>
              <div className="relative">
                <select
                  value={form.lab_subdivision}
                  onChange={e => setField('lab_subdivision', e.target.value)}
                  className="border border-[#1a4a3a] px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
                >
                  <option value="">Nessuna</option>
                  {LAB_SUBDIVISIONS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving || !form.full_name.trim()}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40"
            >
              {saving ? 'Salvataggio…' : isNew ? 'Aggiungi' : 'Salva'}
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

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  taskStats,
  onOpenCompleted,
}: {
  member: Member
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
  taskStats: { total: number; done: number; currentQuarterDone: number; completedTasks: TaskRecord[] } | null
  onOpenCompleted: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('club_members').delete().eq('id', member.id)
    if (!error) onDelete()
    else setDeleting(false)
  }

  return (
    <div className="border-b border-line last:border-b-0 px-5 py-3 flex items-start gap-4 bg-white hover:bg-[#f9f9f9] transition-colors">
      {/* Main info */}
      <div className="flex-1 min-w-0">
        {/* Riga 1: Nome + Titolo inline */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-base font-semibold text-gray-900">{member.full_name}</p>
          {member.title && (
            <p className="text-sm text-[#1a4a3a]">{member.title}</p>
          )}
        </div>

        {/* Riga 3: Badge team + subdivision */}
        {(member.teams ?? []).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2">
            {(member.teams ?? []).map(t => (
              <span
                key={t}
                className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px bg-[#1a4a3a] text-white"
              >
                {teamLabel(t)}
              </span>
            ))}
            {member.lab_subdivision && (
              <span className="text-sm font-medium text-gray-700">
                · {labSubLabel(member.lab_subdivision)}
              </span>
            )}
          </div>
        )}

        {/* Riga 4: Email */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="text-sm text-gray-500 hover:text-[#1a4a3a] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {member.email}
            </a>
          )}
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="text-sm text-gray-600 hover:text-[#1a4a3a] transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {member.phone}
            </a>
          )}
        </div>

        {/* Task counter */}
        <div className="mt-3">
          {taskStats === null ? (
            <span className="text-sm text-gray-500">—</span>
          ) : (
            <span className="text-sm text-gray-500">
              {taskStats.total} assegnate
              {' · '}
              <button
                type="button"
                onClick={onOpenCompleted}
                className="text-sm text-gray-500 underline-offset-2 hover:underline cursor-pointer"
              >
                {taskStats.currentQuarterDone} completate questo quarter
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {confirmDel ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-500">Eliminare?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
            >
              {deleting ? '…' : 'Sì'}
            </button>
            <button
              onClick={() => setConfirmDel(false)}
              className="text-xs text-ink-400 hover:text-ink-700"
            >
              No
            </button>
          </div>
        ) : (
          <>
            {canEdit && (
              <button
                onClick={onEdit}
                title="Modifica"
                className="p-1.5 text-ink-300 hover:text-[#1a4a3a] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setConfirmDel(true)}
                title="Elimina"
                className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { key: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.key === value) ?? options[0]

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none whitespace-nowrap"
      >
        <span>{selected.label}</span>
        <svg
          className="w-4 h-4 text-[#1a4a3a] flex-shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 bg-white border border-[#e5e7eb] shadow-md min-w-full">
          {options.map(o => (
            <button
              key={o.key}
              type="button"
              onMouseDown={() => { onChange(o.key); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm border-b border-[#e5e7eb] last:border-b-0 ${
                o.key === value
                  ? 'bg-[#1a4a3a] text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const profile = useProfile()

  const [members, setMembers]               = useState<Member[]>([])
  const [tasks, setTasks]                   = useState<TaskRecord[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [teamFilter, setTeamFilter]         = useState('all')
  const [roleFilter, setRoleFilter]         = useState('all')
  const [modal, setModal]                   = useState<(Member & { isNew: boolean }) | null>(null)
  const [completedModal, setCompletedModal] = useState<{ memberName: string; tasks: TaskRecord[] } | null>(null)

  const isBoD      = profile?.role === 'bod' || profile?.role === 'director'
  const isDirector = profile?.role === 'director'
  const canAdd     = isBoD

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: memberData }, { data: taskData }] = await Promise.all([
        supabase
          .from('club_members')
          .select('id, user_id, full_name, email, phone, role, title, teams, lab_subdivision')
          .order('role', { ascending: true })
          .order('full_name', { ascending: true }),
        supabase
          .from('tasks')
          .select('id, title, team, status, completed_at, assigned_to'),
      ])

      setMembers((memberData ?? []) as Member[])
      setTasks(
        (taskData ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: r.title as string,
          team: (r.team as string) ?? null,
          status: r.status as string,
          completed_at: (r.completed_at as string) ?? null,
          assigned_to: (r.assigned_to as string[]) ?? [],
        }))
      )
      setLoading(false)
    }
    load()
  }, [])

  const taskStats = useMemo(() => {
    const curQ = currentQuarterInfo()
    const map: Record<string, { total: number; done: number; currentQuarterDone: number; completedTasks: TaskRecord[] }> = {}
    for (const task of tasks) {
      for (const uid of task.assigned_to) {
        if (!map[uid]) map[uid] = { total: 0, done: 0, currentQuarterDone: 0, completedTasks: [] }
        map[uid].total++
        if (task.status === 'done') {
          map[uid].done++
          map[uid].completedTasks.push(task)
          if (task.completed_at) {
            const q = getQuarter(task.completed_at)
            if (q.q === curQ.q && q.year === curQ.year) map[uid].currentQuarterDone++
          }
        }
      }
    }
    for (const uid in map) {
      map[uid].completedTasks.sort((a, b) => {
        if (!a.completed_at) return 1
        if (!b.completed_at) return -1
        return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      })
    }
    return map
  }, [tasks])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter(m => {
      if (q && !m.full_name.toLowerCase().includes(q)) return false
      if (teamFilter !== 'all' && !(m.teams ?? []).includes(teamFilter)) return false
      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      return true
    })
  }, [members, search, teamFilter, roleFilter])

  const grouped = useMemo(() => {
    return ROLE_GROUPS.map(g => ({
      ...g,
      members: filtered
        .filter(m => m.role === g.key)
        .sort((a, b) => lastName(a.full_name).localeCompare(lastName(b.full_name), 'it')),
    })).filter(g => g.members.length > 0)
  }, [filtered])

  function canEditMember(): boolean {
    return isBoD || isDirector
  }

  function handleSaved(saved: Member, isNew: boolean) {
    setMembers(prev =>
      isNew
        ? [...prev, saved]
        : prev.map(m => m.id === saved.id ? saved : m)
    )
    setModal(null)
  }

  function handleDeleted(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-sm text-ink-500">Caricamento...</div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Membri</h1>
          <div className="w-8 h-px bg-[#1a4a3a]" />
        </div>
        {canAdd && (
          <button
            onClick={() => setModal({ ...EMPTY_FORM, id: '', user_id: null, full_name: '', email: null, phone: null, role: 'member', title: null, teams: null, lab_subdivision: null, isNew: true })}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Aggiungi membro
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca per nome…"
            className="w-full border border-line pl-8 pr-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1a4a3a]"
          />
        </div>

        {/* Team filter */}
        <FilterDropdown
          value={teamFilter}
          onChange={setTeamFilter}
          options={[{ key: 'all', label: 'Tutti i team' }, ...TEAM_OPTIONS]}
        />

        {/* Role filter */}
        <FilterDropdown
          value={roleFilter}
          onChange={setRoleFilter}
          options={[{ key: 'all', label: 'Tutti i ruoli' }, ...ROLE_OPTIONS]}
        />

        {/* Result count */}
        <span className="text-xs text-ink-400 ml-auto">{filtered.length} membri</span>
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <p className="text-sm text-ink-500">Nessun membro trovato.</p>
      ) : (
        <div className="space-y-12">
          {grouped.map(group => (
            <div key={group.key}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-4">
                <p className="text-sm font-semibold uppercase tracking-widest text-gray-400">
                  {group.label}
                </p>
                <span className="text-sm text-gray-300">{group.members.length}</span>
                <div className="flex-1 h-px bg-line" />
              </div>

              {/* Rows */}
              <div className="border border-line">
                {group.members.map(m => {
                  const stats = m.user_id
                    ? (taskStats[m.user_id] ?? { total: 0, done: 0, completedTasks: [] })
                    : null
                  return (
                    <MemberRow
                      key={m.id}
                      member={m}
                      canEdit={canEditMember()}
                      canDelete={isBoD}
                      onEdit={() => setModal({ ...m, isNew: false })}
                      onDelete={() => handleDeleted(m.id)}
                      taskStats={stats}
                      onOpenCompleted={() => {
                        if (stats) setCompletedModal({ memberName: m.full_name, tasks: stats.completedTasks })
                      }}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {modal && (
        <MemberFormModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Completed tasks modal */}
      {completedModal && (
        <CompletedTasksModal
          memberName={completedModal.memberName}
          tasks={completedModal.tasks}
          onClose={() => setCompletedModal(null)}
        />
      )}

    </div>
  )
}
