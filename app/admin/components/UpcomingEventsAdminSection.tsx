'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent, EventRegistration } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#1a4a3a]">{title}</h2>
      <div className="w-8 h-px bg-[#1a4a3a] mt-2" />
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
  display_order: string
}

const EMPTY_FORM: FormState = {
  date: '',
  title: '',
  description: '',
  status: 'coming_soon',
  action_type: '',
  action_link: '',
  display_order: '',
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

  // Fetch on mount
  useState(() => {
    const supabase = createClient()
    supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', event.id)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setRegs((data ?? []) as EventRegistration[])
        setLoading(false)
      })
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-black/10 w-full max-w-4xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <div>
            <p className="font-serif text-lg font-bold text-[#1a4a3a]">Registrations</p>
            <p className="text-xs text-[#6b7280] mt-0.5">{event.title} — {event.date}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-[#0a0a0a] text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="overflow-auto flex-1 p-6">
          {loading ? (
            <p className="text-sm text-[#6b7280] text-center py-10">Loading…</p>
          ) : error ? (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
          ) : regs && regs.length === 0 ? (
            <p className="text-sm text-[#6b7280] text-center py-10">No registrations yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 bg-[#f9f9f9]">
                  {['Nome', 'Cognome', 'Email', 'Telefono', 'Anno', 'Data'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-medium text-[#6b7280] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regs?.map(r => (
                  <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-[#fafafa]">
                    <td className="px-3 py-2.5 text-[#0a0a0a] font-medium">{r.nome}</td>
                    <td className="px-3 py-2.5 text-[#0a0a0a]">{r.cognome}</td>
                    <td className="px-3 py-2.5 text-[#6b7280]">{r.email}</td>
                    <td className="px-3 py-2.5 text-[#6b7280]">{r.telefono ?? '—'}</td>
                    <td className="px-3 py-2.5 text-[#6b7280] whitespace-nowrap">{r.anno_di_studio}</td>
                    <td className="px-3 py-2.5 text-[#6b7280] whitespace-nowrap">
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
      description: form.description.trim() || null,
      status: form.status,
      action_type: (form.action_type || null) as 'form' | 'link' | null,
      action_link: form.action_type === 'link' ? (form.action_link.trim() || null) : null,
      display_order: form.display_order ? parseInt(form.display_order) : null,
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
    'w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-black/10 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
          <p className="font-serif text-lg font-bold text-[#1a4a3a]">
            {initial.id ? 'Edit Event' : 'Add Event'}
          </p>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#0a0a0a] text-xl leading-none transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date + Display Order */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Date *</label>
              <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Display Order</label>
              <input type="number" value={form.display_order} onChange={e => set('display_order', e.target.value)} placeholder="0" className={inputClass} />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Event title" className={inputClass} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" className={`${inputClass} resize-none`} />
          </div>

          {/* Status + Action Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Status *</label>
              <select value={form.status} onChange={e => set('status', e.target.value as UpcomingEvent['status'])} className={inputClass}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Action Type</label>
              <select value={form.action_type} onChange={e => set('action_type', e.target.value)} className={inputClass}>
                <option value="">— none —</option>
                {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Action Link (only when type = link) */}
          {form.action_type === 'link' && (
            <div>
              <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-wide mb-1">Action Link</label>
              <input value={form.action_link} onChange={e => set('action_link', e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          )}

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
            <button type="button" onClick={onClose} className="border border-[#d1d5db] text-[#6b7280] hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
      display_order: ev.display_order != null ? String(ev.display_order) : '',
    })
  }

  function handleSaved(saved: UpcomingEvent) {
    setEvents(prev => {
      const exists = prev.find(e => e.id === saved.id)
      return exists
        ? prev.map(e => (e.id === saved.id ? saved : e))
        : [saved, ...prev]
    })
    setFormModal(null)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('upcoming_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <SectionHeading title="Upcoming Events" />

      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-150"
        >
          + Add Event
        </button>
      </div>

      <div className="bg-white border border-black/10 overflow-x-auto">
        {events.length === 0 ? (
          <p className="text-sm text-[#6b7280] text-center py-10">No upcoming events.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 bg-[#f9f9f9]">
                {['Date', 'Title', 'Status', 'Action', 'Azioni'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(ev => (
                  <tr key={ev.id} className="border-b border-black/5 last:border-0 hover:bg-[#fafafa] transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0a0a0a] whitespace-nowrap">{ev.date}</td>
                    <td className="px-4 py-3 text-[#0a0a0a] max-w-[200px]">
                      <span title={ev.title}>
                        {ev.title.length > 50 ? ev.title.slice(0, 50) + '…' : ev.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium tracking-widest uppercase px-2 py-1 ${
                        ev.status === 'open'
                          ? 'bg-[#1a4a3a] text-white'
                          : ev.status === 'completed'
                          ? 'border border-gray-300 text-gray-500'
                          : 'border border-[#1a4a3a] text-[#1a4a3a]'
                      }`}>
                        {ev.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6b7280] text-xs">
                      {ev.action_type ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => setRegsModal(ev)}
                          className="border border-[#6b7280] text-[#6b7280] hover:bg-[#6b7280] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-150 whitespace-nowrap"
                        >
                          Registrations
                        </button>
                        <button
                          onClick={() => openEdit(ev)}
                          className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-150"
                        >
                          Edit
                        </button>
                        {deleteConfirm === ev.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600">Confirm?</span>
                            <button
                              onClick={() => handleDelete(ev.id)}
                              className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1.5 transition-colors duration-150"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="border border-[#d1d5db] text-[#6b7280] hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1.5 transition-colors duration-150"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(ev.id)}
                            className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors duration-150"
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
