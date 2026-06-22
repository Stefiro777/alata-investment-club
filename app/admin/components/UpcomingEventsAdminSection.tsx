'use client'

import { useState, useEffect } from 'react'
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
  registration_field: 'motivation' | 'panelists'
}

const EMPTY_FORM: FormState = {
  date: '',
  title: '',
  description: '',
  status: 'coming_soon',
  action_type: '',
  action_link: '',
  registration_field: 'motivation',
}

function EnvelopeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="2" y="4" width="20" height="16" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

// ── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({
  event,
  recipientCount,
  onClose,
}: {
  event: UpcomingEvent
  recipientCount: number
  onClose: () => void
}) {
  const [subject, setSubject] = useState(`Update: ${event.title}`)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return
    setStatus('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/events/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, subject: subject.trim(), message: message.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Failed to send')
        setStatus('error')
      } else {
        setResult(json)
        setStatus('done')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget && status !== 'sending') onClose() }}
    >
      <div className="bg-white border border-line-faint w-full max-w-lg shadow-xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-line-faint">
          <div>
            <p className="font-serif text-base font-bold text-forest uppercase tracking-widest">
              Email to Registrants
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              {event.title} — {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'sending'}
            className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors ml-4 mt-0.5 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {status === 'done' && result ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-forest font-medium text-sm tracking-wide">
                ✓ Sent: {result.sent} — Failed: {result.failed}
              </p>
              <button
                onClick={onClose}
                className="mt-4 border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  disabled={status === 'sending'}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Message</label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={status === 'sending'}
                  placeholder="Write your message here…"
                  className={`${inputClass} resize-none`}
                />
                <p className="text-[11px] text-ink-400 mt-1">
                  [Nome] will be replaced with each registrant's first name.
                </p>
              </div>

              {status === 'error' && errorMsg && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={status === 'sending'}
                  className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={status === 'sending' || !subject.trim() || !message.trim()}
                  className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Registrations Modal ──────────────────────────────────────────────────────
function RegistrationsModal({
  event,
  onClose,
  onSendEmail,
}: {
  event: UpcomingEvent
  onClose: () => void
  onSendEmail: (count: number) => void
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
          <div className="flex items-center gap-3">
            {!loading && !error && regs && regs.length > 0 && (
              <button
                onClick={() => onSendEmail(regs.length)}
                className="flex items-center gap-1.5 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-widest uppercase px-3 py-1.5 transition-colors"
              >
                <EnvelopeIcon />
                Send Email to All
              </button>
            )}
            <button
              onClick={onClose}
              className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors"
            >
              ✕
            </button>
          </div>
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
      registration_field: form.registration_field,
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
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Date *</label>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Event title" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description" className={`${inputClass} resize-none`} />
          </div>

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

          {form.action_type === 'link' && (
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Action Link</label>
              <input value={form.action_link} onChange={e => set('action_link', e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-2">Registration Field</label>
            <div className="flex gap-2">
              {(['motivation', 'panelists'] as const).map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set('registration_field', opt)}
                  className={`text-xs font-medium tracking-wide px-4 py-2 border transition-colors duration-fast ${
                    form.registration_field === opt
                      ? 'bg-forest text-white border-forest'
                      : 'bg-white text-ink-500 border-line hover:border-forest hover:text-forest'
                  }`}
                >
                  {opt === 'motivation' ? 'Motivation' : 'Questions for Panelists'}
                </button>
              ))}
            </div>
          </div>

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

// ── Copy link button ──────────────────────────────────────────────────────────
function CopyLinkButton({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(`https://alatainvestmentclub.com/events?register=${eventId}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy registration link"
      className="flex items-center justify-center border border-[#6b7280] text-ink-500 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>
      )}
    </button>
  )
}

// ── Send QR button ────────────────────────────────────────────────────────────
function SendQrButton({ event, registrationIds }: { event: UpcomingEvent; registrationIds: string[] }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)

  async function handleSend() {
    setState('sending')
    try {
      const res = await fetch('/api/admin/crm/send-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_ids: registrationIds }),
      })
      const json = await res.json()
      if (!res.ok) { setState('error'); return }
      setResult(json)
      setState('done')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  if (state === 'confirm') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-ink-500 whitespace-nowrap">
          Send QR to {registrationIds.length}?
        </span>
        <button
          onClick={handleSend}
          className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
        >
          Yes
        </button>
        <button
          onClick={() => setState('idle')}
          className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors duration-fast"
        >
          No
        </button>
      </div>
    )
  }

  const label =
    state === 'sending' ? '…' :
    state === 'done'    ? `✓ ${result?.sent ?? 0}` :
    state === 'error'   ? '✕' : null

  return (
    <button
      onClick={() => state === 'idle' && setState('confirm')}
      disabled={state === 'sending'}
      title="Send QR codes to all registrants"
      className={`flex items-center border text-xs font-medium px-2 py-1 transition-colors duration-fast disabled:opacity-50 ${
        state === 'done'  ? 'border-forest text-forest' :
        state === 'error' ? 'border-red-400 text-red-500' :
        'border-forest text-forest hover:bg-forest hover:text-white'
      }`}
    >
      {label ?? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M20 20h.01M17 20h.01M14 20h.01" />
        </svg>
      )}
    </button>
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
  const [emailEventTarget, setEmailEventTarget] = useState<{ event: UpcomingEvent; recipientCount: number } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [regIds, setRegIds] = useState<Record<string, string[]>>({})


  const today = new Date(new Date().toDateString())
  const activeEvents = events.filter(ev => new Date(ev.date) >= today)
  const completedEvents = events.filter(ev => new Date(ev.date) < today)

  // Fetch registration counts and ids for all events
  useEffect(() => {
    if (events.length === 0) return
    Promise.all(
      events.map(ev =>
        fetch(`/api/event-registrations?event_id=${ev.id}`)
          .then(r => r.json())
          .then(({ data }) => ({ id: ev.id, rows: (data ?? []) as { id: string }[] }))
          .catch(() => ({ id: ev.id, rows: [] }))
      )
    ).then(results => {
      const counts: Record<string, number> = {}
      const ids: Record<string, string[]> = {}
      for (const { id, rows } of results) {
        counts[id] = rows.length
        ids[id] = rows.map(r => r.id)
      }
      setRegCounts(counts)
      setRegIds(ids)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
      registration_field: ev.registration_field ?? 'motivation',
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

  function openEmailCompose(ev: UpcomingEvent) {
    setEmailEventTarget({ event: ev, recipientCount: regCounts[ev.id] ?? 0 })
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <SectionHeading title="Upcoming Events" />

      <div className="flex justify-end mb-4">
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
                {['Date', 'Title', 'Status', 'Action', 'Azioni'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEvents.map((ev) => (
                <tr
                  key={ev.id}
                  className="border-b border-black/5 last:border-0 hover:bg-paper-cool transition-colors"
                >
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
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRegsModal(ev)}
                        className="border border-[#6b7280] text-ink-500 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                      >
                        Registrations
                      </button>
                      {(regCounts[ev.id] ?? 0) > 0 && (
                        <button
                          onClick={() => openEmailCompose(ev)}
                          title="Send email to registrants"
                          className="flex items-center border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                        >
                          <EnvelopeIcon />
                        </button>
                      )}
                      {(regCounts[ev.id] ?? 0) > 0 && (
                        <SendQrButton event={ev} registrationIds={regIds[ev.id] ?? []} />
                      )}
                      <CopyLinkButton eventId={ev.id} />
                      <button
                        onClick={() => openEdit(ev)}
                        className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                      >
                        Edit
                      </button>
                      {deleteConfirm === ev.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-red-600">Sure?</span>
                          <button
                            onClick={() => handleDelete(ev.id)}
                            className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors duration-fast"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(ev.id)}
                          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
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
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setRegsModal(ev)}
                            className="border border-[#6b7280] text-ink-400 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                          >
                            Registrations
                          </button>
                          {(regCounts[ev.id] ?? 0) > 0 && (
                            <button
                              onClick={() => openEmailCompose(ev)}
                              title="Send email to registrants"
                              className="flex items-center border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                            >
                              <EnvelopeIcon />
                            </button>
                          )}
                          {(regCounts[ev.id] ?? 0) > 0 && (
                            <SendQrButton event={ev} registrationIds={regIds[ev.id] ?? []} />
                          )}
                          <CopyLinkButton eventId={ev.id} />
                          <button
                            onClick={() => openEdit(ev)}
                            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                          >
                            Edit
                          </button>
                          {deleteConfirm === ev.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-red-600">Sure?</span>
                              <button
                                onClick={() => handleDelete(ev.id)}
                                className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors duration-fast"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(ev.id)}
                              className="border border-red-300 text-red-400 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors duration-fast"
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
          onSendEmail={(count) => {
            setEmailEventTarget({ event: regsModal, recipientCount: count })
          }}
        />
      )}

      {/* Compose email modal — z-9999 to appear above registrations modal */}
      {emailEventTarget && (
        <ComposeModal
          event={emailEventTarget.event}
          recipientCount={emailEventTarget.recipientCount}
          onClose={() => setEmailEventTarget(null)}
        />
      )}
    </div>
  )
}
