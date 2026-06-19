'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent, EventRegistration } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

const STATUS_OPTIONS: UpcomingEvent['status'][] = ['open', 'coming_soon', 'completed']
const ACTION_OPTIONS = ['form', 'link'] as const

type FormState = {
  date: string
  title: string
  description: string
  status: UpcomingEvent['status']
  action_type: 'form' | 'link' | ''
  action_link: string
}

const EMPTY_FORM: FormState = {
  date: '',
  title: '',
  description: '',
  status: 'coming_soon',
  action_type: '',
  action_link: '',
}

// ── Registrations Modal ──────────────────────────────────────────────────────
function RegistrationsModal({
  event,
  onClose,
}: {
  event: UpcomingEvent
  onClose: () => void
}) {
  const [regs, setRegs] = useState<EventRegistration[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/event-registrations?event_id=${event.id}`)
      .then(res => res.json())
      .then(({ data, error: err }) => {
        if (err) setError(err)
        else setRegs((data ?? []) as EventRegistration[])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message ?? 'Failed to load registrations')
        setLoading(false)
      })
  }, [event.id])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-line-faint w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line-faint">
          <div>
            <p className="font-serif text-lg font-bold text-forest">Registrations</p>
            <p className="text-xs text-ink-500 mt-0.5">{event.title} — {event.date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto flex-1 p-6">
          {loading ? (
            <p className="text-sm text-ink-500 text-center py-10">Loading…</p>
          ) : error ? (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
          ) : regs && regs.length === 0 ? (
            <p className="text-sm text-ink-500 text-center py-10">No registrations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line-faint bg-[#f9f9f9]">
                  {['Nome', 'Cognome', 'Email', 'Telefono', 'Anno', 'Data'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-ink-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regs?.map(r => (
                  <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-paper-cool">
                    <td className="px-3 py-2.5 text-ink-900 font-medium">{r.nome}</td>
                    <td className="px-3 py-2.5 text-ink-900">{r.cognome}</td>
                    <td className="px-3 py-2.5 text-ink-500">{r.email}</td>
                    <td className="px-3 py-2.5 text-ink-500">{r.telefono ?? '—'}</td>
                    <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap">{r.anno_di_studio}</td>
                    <td className="px-3 py-2.5 text-ink-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Event Form Modal ─────────────────────────────────────────────────────────
function EventFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial: FormState & { id?: string }
  onSave: (event: UpcomingEvent) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date || !form.title.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      date: form.date,
      title: form.title.trim(),
      description: form.description || null,
      status: form.status,
      action_type: (form.action_type || null) as 'form' | 'link' | null,
      action_link: form.action_type === 'link' ? (form.action_link.trim() || null) : null,
      ...(!initial.id ? { display_order: 999 } : {}),
    }

    if (initial.id) {
      const { data, error: err } = await supabase
        .from('upcoming_events')
        .update(payload)
        .eq('id', initial.id)
        .select('*')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as UpcomingEvent)
    } else {
      const { data, error: err } = await supabase
        .from('upcoming_events')
        .insert(payload)
        .select('*')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as UpcomingEvent)
    }
    setSaving(false)
  }

  const inputClass =
    'w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-line-faint w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line-faint">
          <p className="font-serif text-lg font-bold text-forest">
            {initial.id ? 'Edit Event' : 'Add Event'}
          </p>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Date *</label>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Event title" className={inputClass} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" className={`${inputClass} resize-none`} />
          </div>

          {/* Status + Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Status *</label>
              <select value={form.status} onChange={e => set('status', e.target.value as UpcomingEvent['status'])} className={inputClass}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Action Type</label>
              <select value={form.action_type} onChange={e => set('action_type', e.target.value)} className={inputClass}>
                <option value="">— none —</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Action Link (only when type = link) */}
          {form.action_type === 'link' && (
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Action Link</label>
              <input value={form.action_link} onChange={e => set('action_link', e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          )}

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
            <button type="button" onClick={onClose} className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-fast">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Drag handle icon ─────────────────────────────────────────────────────────
function DragHandle() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" className="text-ink-400">
      <circle cx="4" cy="3" r="1.5" />
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="4" cy="8" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="4" cy="13" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  )
}

// ── Main Section ─────────────────────────────────────────────────────────────
export default function UpcomingEventsAdminSection({
  initialEvents,
}: {
  initialEvents: UpcomingEvent[]
}) {
  const [events, setEvents] = useState<UpcomingEvent[]>(initialEvents)
  const [formModal, setFormModal] = useState<(FormState & { id?: string }) | null>(null)
  const [regsModal, setRegsModal] = useState<UpcomingEvent | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [orderSaved, setOrderSaved] = useState(false)
  const [completedOpen, setCompletedOpen] = useState(false)
  const dragIndex = useRef<number | null>(null)

  const today = new Date(new Date().toDateString())
  const activeEvents = events.filter(ev => new Date(ev.date) >= today)
  const completedEvents = events.filter(ev => new Date(ev.date) < today)

  function openAdd() {
    setFormModal({ ...EMPTY_FORM })
  }

  function openEdit(ev: UpcomingEvent) {
    setFormModal({
      id: ev.id,
      date: ev.date,
      title: ev.title,
      description: ev.description ?? '',
      status: ev.status,
      action_type: ev.action_type ?? '',
      action_link: ev.action_link ?? '',
    })
  }

  function handleSaved(saved: UpcomingEvent) {
    setEvents(prev => {
      const exists = prev.find(e => e.id === saved.id)
      return exists
        ? prev.map(e => (e.id === saved.id ? saved : e))
        : [...prev, saved]
    })
    setFormModal(null)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('upcoming_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleteConfirm(null)
  }

  function onDragStart(i: number) {
    dragIndex.current = i
  }

  async function onDrop(i: number) {
    const from = dragIndex.current
    dragIndex.current = null
    if (from === null || from === i) return

    const reorderedActive = [...activeEvents]
    const [moved] = reorderedActive.splice(from, 1)
    reorderedActive.splice(i, 0, moved)
    setEvents([...reorderedActive, ...completedEvents])

    const items = reorderedActive.map((ev, idx) => ({ id: ev.id, display_order: idx }))
    const res = await fetch('/api/upcoming-events/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (res.ok) {
      setOrderSaved(true)
      setTimeout(() => setOrderSaved(false), 2500)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <SectionHeading title="Upcoming Events" />

      <div className="flex items-center justify-between mb-4">
        <div className="h-6">
          {orderSaved && (
            <span className="text-xs text-forest font-medium tracking-wide animate-pulse">
              ✓ Order saved
            </span>
          )}
        </div>
        <button
          onClick={openAdd}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-fast"
        >
          + Add Event
        </button>
      </div>

      {/* Active events table */}
      <div className="bg-white border border-line-faint overflow-x-auto">
        {activeEvents.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-10">No upcoming events.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-faint bg-[#f9f9f9]">
                <th className="px-4 py-3 w-8" />
                {['Date', 'Title', 'Status', 'Action', 'Azioni'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((ev, i) => (
                <tr
                  key={ev.id}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(i)}
                  className="border-b border-black/5 last:border-0 hover:bg-paper-cool transition-colors"
                >
                  <td className="px-4 py-3 cursor-grab active:cursor-grabbing">
                    <DragHandle />
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900 whitespace-nowrap">{ev.date}</td>
                  <td className="px-4 py-3 text-ink-900 max-w-[200px]">
                    <span title={ev.title}>
                      {ev.title.length > 50 ? ev.title.slice(0, 50) + '…' : ev.title}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium tracking-widest uppercase px-2 py-1 ${
                      ev.status === 'open'
                        ? 'bg-forest text-white'
                        : 'border border-forest text-forest'
                    }`}>
                      {ev.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs">
                    {ev.action_type ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setRegsModal(ev)}
                        className="border border-[#6b7280] text-ink-500 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast whitespace-nowrap"
                      >
                        Registrations
                      </button>
                      <button
                        onClick={() => openEdit(ev)}
                        className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast"
                      >
                        Edit
                      </button>
                      {deleteConfirm === ev.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Confirm?</span>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1.5 transition-colors duration-fast"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1.5 transition-colors duration-fast"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(ev.id)}
                          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Completed events collapsible */}
      {completedEvents.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setCompletedOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#f3f4f6] border border-[#e5e7eb] text-xs font-medium tracking-widest uppercase text-ink-500 hover:bg-[#e9eaeb] transition-colors"
          >
            <span>Completed ({completedEvents.length})</span>
            <span>{completedOpen ? '▲' : '▼'}</span>
          </button>

          {completedOpen && (
            <div className="bg-white border border-t-0 border-[#e5e7eb] overflow-x-auto opacity-70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line-faint bg-[#f9f9f9]">
                    <th className="px-4 py-3 w-8" />
                    {['Date', 'Title', 'Status', 'Action', 'Azioni'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completedEvents.map(ev => (
                    <tr
                      key={ev.id}
                      className="border-b border-black/5 last:border-0 hover:bg-paper-cool transition-colors"
                    >
                      <td className="px-4 py-3 text-ink-300">
                        <DragHandle />
                      </td>
                      <td className="px-4 py-3 font-medium text-ink-500 whitespace-nowrap">{ev.date}</td>
                      <td className="px-4 py-3 text-ink-500 max-w-[200px]">
                        <span title={ev.title}>
                          {ev.title.length > 50 ? ev.title.slice(0, 50) + '…' : ev.title}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-medium tracking-widest uppercase px-2 py-1 border border-gray-300 text-gray-400">
                          completed
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-400 text-xs">
                        {ev.action_type ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setRegsModal(ev)}
                            className="border border-[#6b7280] text-ink-400 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast whitespace-nowrap"
                          >
                            Registrations
                          </button>
                          <button
                            onClick={() => openEdit(ev)}
                            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast"
                          >
                            Edit
                          </button>
                          {deleteConfirm === ev.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600">Confirm?</span>
                              <button
                                onClick={() => handleDelete(ev.id)}
                                className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1.5 transition-colors duration-fast"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1.5 transition-colors duration-fast"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(ev.id)}
                              className="border border-red-300 text-red-400 hover:bg-red-500 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-fast"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Event form modal */}
      {formModal && (
        <EventFormModal
          initial={formModal}
          onSave={handleSaved}
          onClose={() => setFormModal(null)}
        />
      )}

      {/* Registrations modal */}
      {regsModal && (
        <RegistrationsModal
          event={regsModal}
          onClose={() => setRegsModal(null)}
        />
      )}
    </div>
  )
}
