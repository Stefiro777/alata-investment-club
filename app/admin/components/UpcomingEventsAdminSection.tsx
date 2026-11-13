'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import EventWaitlistAdmin from './EventWaitlistAdmin'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import type { UpcomingEvent, EventRegistration } from '@/lib/types'
import { slugify } from '@/lib/slug'
import { Pill, SegmentedPills, SectionHeading } from '@/app/components/member/ui'

const STATUS_OPTIONS: UpcomingEvent['status'][] = ['open', 'coming_soon', 'completed']
const ACTION_OPTIONS = ['form', 'link'] as const

type GalleryImage = { id: string; event_id: string; url: string; display_order: number }

type FormState = {
  title: string
  date: string
  start_time: string
  end_time: string
  location: string
  description: string
  status: UpcomingEvent['status']
  action_type: 'form' | 'link' | ''
  action_link: string
  registration_field: 'motivation' | 'panelists' | null
  ticket_price_eur: string
  member_price_eur: string
  capacity: string // empty = unlimited
  members_only: boolean
  slug: string
}

const EMPTY_FORM: FormState = {
  title: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  description: '',
  status: 'coming_soon',
  action_type: '',
  action_link: '',
  registration_field: null,
  ticket_price_eur: '',
  member_price_eur: '',
  capacity: '',
  members_only: false,
  slug: '',
}

function eventToForm(ev: UpcomingEvent): FormState {
  return {
    title: ev.title,
    date: ev.date,
    start_time: ev.start_time ?? '',
    end_time: ev.end_time ?? '',
    location: ev.location ?? '',
    description: ev.description ?? '',
    status: ev.status,
    action_type: ev.action_type ?? '',
    action_link: ev.action_link ?? '',
    registration_field: ev.registration_field ?? null,
    ticket_price_eur: ev.ticket_price_cents != null ? (ev.ticket_price_cents / 100).toFixed(2) : '',
    member_price_eur: ev.member_price_cents != null ? (ev.member_price_cents / 100).toFixed(2) : '',
    capacity: ev.capacity != null ? String(ev.capacity) : '',
    members_only: !!ev.members_only,
    slug: ev.slug ?? '',
  }
}

function formToPayload(form: FormState) {
  const ticketCents = form.ticket_price_eur ? Math.round(parseFloat(form.ticket_price_eur) * 100) : null
  const memberCents = form.member_price_eur ? Math.round(parseFloat(form.member_price_eur) * 100) : null
  const capacityNum = form.capacity.trim() ? Math.floor(Number(form.capacity)) : null
  return {
    title: form.title.trim(),
    date: form.date,
    start_time: form.start_time || null,
    end_time: form.end_time || null,
    location: form.location.trim() || null,
    description: form.description || null,
    status: form.status,
    action_type: (form.action_type || null) as 'form' | 'link' | null,
    action_link: form.action_type === 'link' ? (form.action_link.trim() || null) : null,
    registration_field: form.registration_field,
    ticket_price_cents: ticketCents && ticketCents > 0 ? ticketCents : null,
    member_price_cents: memberCents && memberCents >= 0 ? memberCents : null,
    capacity: capacityNum !== null && Number.isFinite(capacityNum) && capacityNum > 0 ? capacityNum : null,
    members_only: form.members_only,
    slug: form.slug.trim() || slugify(form.title) || `event-${Date.now().toString(36)}`,
  }
}

function EnvelopeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter">
      <rect x="2" y="4" width="20" height="16" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  )
}

// ── Gallery upload helper ────────────────────────────────────────────────────
async function uploadToGallery(file: File): Promise<{ url: string } | { error: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', 'event-gallery')
  const res = await fetch('/api/featured-gallery/upload', { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok) return { error: json.error ?? 'Upload failed' }
  return { url: json.url }
}

// ── Compose Modal ────────────────────────────────────────────────────────────
type Registrant = { id: string; nome: string | null; cognome: string | null; email: string }

function ComposeModal({
  event,
  onClose,
}: {
  event: UpcomingEvent
  onClose: () => void
}) {
  const [mode, setMode] = useState<'invite' | 'custom'>('invite')
  const [regs, setRegs] = useState<Registrant[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadError, setLoadError] = useState<string | null>(null)
  const [link, setLink] = useState('')
  const [subject, setSubject] = useState(`Update: ${event.title}`)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/event-registrations?event_id=${event.id}`)
      .then(r => r.json())
      .then(({ data, error }) => {
        if (error) { setLoadError(error); return }
        const rows = (data ?? []) as Registrant[]
        setRegs(rows)
        setSelected(new Set(rows.map(r => r.id)))
      })
      .catch(err => setLoadError(err.message ?? 'Failed to load registrants'))
  }, [event.id])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = !!regs && regs.length > 0 && selected.size === regs.length

  const trimmedLink = link.trim()
  const inviteSubject = `You've been selected: ${event.title}`
  const inviteMessage =
    `Congratulations [Nome], you've been chosen to take part in ${event.title}!\n\n` +
    `We look forward to seeing you.` +
    (trimmedLink ? `\n\nHere is the link: ${trimmedLink}` : '')

  const finalSubject = mode === 'invite' ? inviteSubject : subject.trim()
  const finalMessage = mode === 'invite' ? inviteMessage : message.trim()
  const canSend = status !== 'sending' && selected.size > 0 && !!finalSubject && !!finalMessage

  async function handleSend() {
    if (!canSend) return
    setStatus('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/events/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          subject: finalSubject,
          message: finalMessage,
          registration_ids: Array.from(selected),
        }),
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
  const labelClass = 'block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1'
  const busy = status === 'sending'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div className="bg-white border border-line-faint w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-line-faint">
          <div>
            <p className="font-serif text-base font-bold text-forest uppercase tracking-widest">
              Email to Registrants
            </p>
            <p className="text-xs text-ink-500 mt-0.5">
              {event.title} — {selected.size} of {regs?.length ?? 0} selected
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors ml-4 mt-0.5 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
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
              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className={labelClass}>Recipients</label>
                  {regs && regs.length > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setSelected(allSelected ? new Set() : new Set(regs.map(r => r.id)))}
                      className="text-[11px] text-forest hover:underline disabled:opacity-40"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
                <div className="border border-line max-h-44 overflow-y-auto divide-y divide-black/5">
                  {loadError ? (
                    <p className="text-red-600 text-xs p-3">{loadError}</p>
                  ) : regs === null ? (
                    <p className="text-xs text-ink-500 p-3">Loading…</p>
                  ) : regs.length === 0 ? (
                    <p className="text-xs text-ink-500 p-3">No registrants.</p>
                  ) : (
                    regs.map(r => (
                      <label key={r.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-paper-cool">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          disabled={busy}
                          className="h-4 w-4 accent-forest flex-shrink-0"
                        />
                        <span className="text-sm text-ink-900 truncate">
                          {r.nome} {r.cognome}
                          <span className="text-ink-400 text-xs ml-2">{r.email}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Mode switch */}
              <SegmentedPills
                label="Message"
                disabled={busy}
                options={[{ value: 'invite', label: 'Quick invite' }, { value: 'custom', label: 'Custom message' }]}
                value={mode}
                onChange={setMode}
              />

              {mode === 'invite' ? (
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Meeting link (optional)</label>
                    <input
                      value={link}
                      onChange={e => setLink(e.target.value)}
                      disabled={busy}
                      placeholder="https://meet.google.com/…"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Preview</label>
                    <div className="border border-line-faint bg-[#f9f9f9] px-3 py-3 text-sm text-ink-900 whitespace-pre-wrap leading-relaxed">
                      <span className="block text-[11px] text-ink-400 mb-2">Subject: {inviteSubject}</span>
                      {inviteMessage}
                    </div>
                    <p className="text-[11px] text-ink-400 mt-1">
                      [Nome] is replaced with each recipient&apos;s name.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>Subject</label>
                    <input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      disabled={busy}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Message</label>
                    <textarea
                      rows={6}
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      disabled={busy}
                      placeholder="Write your message here…"
                      className={`${inputClass} resize-none`}
                    />
                    <p className="text-[11px] text-ink-400 mt-1">
                      [Nome] will be replaced with each registrant&apos;s first name.
                    </p>
                  </div>
                </>
              )}

              {status === 'error' && errorMsg && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!canSend}
                  className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? 'Sending…' : `Send to ${selected.size}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Registrations Modal (full list — fetched only when opened) ──────────────
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

// ── Add Event Modal (creation only — no gallery until the event exists) ─────
function AddEventModal({
  onSave,
  onClose,
}: {
  onSave: (event: UpcomingEvent) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
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
    const { data, error: err } = await supabase
      .from('upcoming_events')
      .insert(formToPayload(form))
      .select('*')
      .single()

    if (err) {
      setError(err.code === '23505' ? 'That slug is already taken by another event.' : err.message)
      setSaving(false)
      return
    }
    onSave(data as UpcomingEvent)
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
          <p className="font-serif text-lg font-bold text-forest">Add Event</p>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 text-xl leading-none transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Event title" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Date *</label>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1">Status *</label>
            <select value={form.status} onChange={e => set('status', e.target.value as UpcomingEvent['status'])} className={inputClass}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <p className="text-[11px] text-ink-400">
            You can fill in the rest of the details (times, location, description, pricing, gallery…) after creating the event, by clicking on its row.
          </p>

          <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
            <button type="button" onClick={onClose} className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-fast">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Gallery editor ────────────────────────────────────────────────────────────
function GalleryEditor({ eventId }: { eventId: string }) {
  const [images, setImages] = useState<GalleryImage[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    createClient()
      .from('event_images')
      .select('*')
      .eq('event_id', eventId)
      .order('display_order', { ascending: true })
      .then(({ data }) => setImages((data ?? []) as GalleryImage[]))
  }

  useEffect(() => { load() }, [eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError(null)
    const startOrder = images?.length ?? 0
    const results = await Promise.all(files.map(f => uploadToGallery(f)))
    const errors = results.filter((r): r is { error: string } => 'error' in r)
    if (errors.length) setError(errors.map(r => r.error).join(', '))
    const urls = results.filter((r): r is { url: string } => 'url' in r).map(r => r.url)
    for (let i = 0; i < urls.length; i++) {
      await fetch('/api/admin/events/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, url: urls[i], display_order: startOrder + i }),
      })
    }
    load()
    setUploading(false)
    e.target.value = ''
  }

  async function handleRemove(id: string) {
    await fetch(`/api/admin/events/gallery?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function handleMove(index: number, dir: -1 | 1) {
    if (!images) return
    const target = index + dir
    if (target < 0 || target >= images.length) return
    const reordered = [...images]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setImages(reordered)
    await fetch('/api/admin/events/gallery', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: reordered.map((img, i) => ({ id: img.id, display_order: i })),
      }),
    })
    load()
  }

  return (
    <div>
      <label className="rd-eyebrow mb-2 block text-[10px] text-earth-500">Photos for the event page</label>
      {images === null ? (
        <p className="text-xs text-ink-400">Loading…</p>
      ) : (
        <div className="flex flex-wrap gap-3 mb-3">
          {images.map((img, i) => (
            <div key={img.id} className="relative w-24 h-24 border border-line-faint overflow-hidden group">
              <Image src={img.url} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                <div className="flex gap-1">
                  <button type="button" onClick={() => handleMove(i, -1)} disabled={i === 0}
                    className="w-6 h-6 flex items-center justify-center bg-white/90 text-ink-900 text-xs disabled:opacity-30">←</button>
                  <button type="button" onClick={() => handleMove(i, 1)} disabled={i === images.length - 1}
                    className="w-6 h-6 flex items-center justify-center bg-white/90 text-ink-900 text-xs disabled:opacity-30">→</button>
                </div>
                <button type="button" onClick={() => handleRemove(img.id)}
                  className="text-[10px] uppercase tracking-wide bg-red-500 text-white px-2 py-0.5">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <label className="inline-block border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors cursor-pointer">
        {uploading ? 'Uploading…' : '+ Add photos'}
        <input type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} disabled={uploading} />
      </label>
      {error && <p className="text-red-600 text-xs mt-2 border-l-2 border-red-400 pl-2 py-1">{error}</p>}
    </div>
  )
}

// ── Event sheet (board AEvd): next event, registrations, entry codes, extra field, details ──────

const QUICK_STATUS: { value: UpcomingEvent['status']; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'coming_soon', label: 'Soon' },
  { value: 'completed', label: 'Closed' },
]
const STATUS_LABEL: Record<string, string> = { open: 'Open', coming_soon: 'Soon', completed: 'Closed' }
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const fieldCls = 'rd-field mt-0 w-full py-1 text-[18px]'
const labelCls = 'rd-eyebrow block text-[10px] text-earth-500'
const dangerBtn = 'rounded-full border border-[#8a2a1d] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a2a1d] transition-colors hover:bg-[#8a2a1d] hover:text-ivory'

function longDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** A titled block of the sheet: the shared section heading, then its rows. */
function SheetSection({ title, meta, children, flush }: { title: string; meta?: string; children: React.ReactNode; flush?: boolean }) {
  return (
    <section>
      <SectionHeading as="h3" title={title} meta={meta} flush={flush} />
      {children}
    </section>
  )
}

/** A line with a title, a sentence and an italic action on the right. */
function ActionRow({ title, detail, action, onClick, disabled }: { title: string; detail?: string; action: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-night/20 py-4 text-left transition-colors hover:bg-night/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="min-w-0">
        <span className="rd-display block text-[22px] leading-[1.15]">{title}</span>
        {detail && <span className="mt-1 block text-[12px] leading-[1.5] text-earth-700">{detail}</span>}
      </span>
      <span className="rd-italic text-[22px]">{action}</span>
    </button>
  )
}

function EventSheet({
  event, regCount, taken, waitlistCount, isNext, statusBusy,
  onSaved, onDeleted, onStatus, onShowRegistrations, onSendEmail, onSendQr, onCopyLink, onShowWaitlist,
}: {
  event: UpcomingEvent
  regCount: number
  /** Seats taken now (registrations + active holds); null while loading. */
  taken: number | null
  waitlistCount: number
  isNext: boolean
  statusBusy: boolean
  onSaved: (ev: UpcomingEvent) => void
  onDeleted: () => void
  onStatus: (s: UpcomingEvent['status']) => void
  onShowRegistrations: () => void
  onSendEmail: () => void
  onSendQr: () => void
  onCopyLink: () => void
  onShowWaitlist: () => void
}) {
  const [form, setForm] = useState<FormState>(() => eventToForm(event))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrConfirm, setQrConfirm] = useState(false)

  function set(key: keyof FormState, value: string) {
    setSaved(false)
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.date || !form.title.trim()) { setError('Title and date are required.'); return }
    setSaving(true)
    setError(null)
    const { data, error: err } = await createClient()
      .from('upcoming_events')
      .update(formToPayload(form))
      .eq('id', event.id)
      .select('*')
      .single()
    setSaving(false)
    if (err) {
      setError(err.code === '23505' ? 'That slug is already taken by another event.' : err.message)
      return
    }
    setSaved(true)
    onSaved(data as UpcomingEvent)
  }

  function handleCopyLink() {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const previewSlug = form.slug.trim() || slugify(form.title) || 'event-slug'
  const seats = taken ?? regCount
  const cap = event.capacity
  const when = [longDate(event.date), event.start_time ? (event.end_time ? `${event.start_time}–${event.end_time}` : event.start_time) : null, event.location].filter(Boolean).join(' · ')
  const extra = event.registration_field === 'motivation' ? 'Motivation' : event.registration_field === 'panelists' ? 'Questions for the speaker' : 'None'

  return (
    <div>
      {/* Header: the event, and how full it is */}
      <SheetSection flush title={isNext ? 'Next event' : 'Event'} meta={STATUS_LABEL[event.status]?.toUpperCase()}>
        <div className="pt-5">
          <div className="rd-display text-[clamp(26px,2.6vw,32px)] leading-[1.1]">{event.title}</div>
          <div className="mt-2 text-[13px] text-earth-700">{when}</div>
        </div>
        {cap ? (
          <div className="relative mt-5 border-t border-night">
            <i className="absolute left-0 top-[-2px] block h-1 bg-club" style={{ width: `${Math.round(Math.min(1, seats / cap) * 100)}%` }} />
          </div>
        ) : (
          <div className="mt-5 border-t border-night" />
        )}
        <div className="rd-eyebrow mt-2 text-[10px] text-earth-500">
          {cap ? `${seats} of ${cap} registered` : `${regCount} registered · no seat limit`}
        </div>
        <div className="mt-5">
          <div className={`${labelCls} mb-2`}>Status</div>
          <SegmentedPills size="sm" label="Status" disabled={statusBusy} options={QUICK_STATUS} value={event.status} onChange={onStatus} />
        </div>
      </SheetSection>

      <SheetSection title="Registrations" meta={`${regCount} ${regCount === 1 ? 'person' : 'people'}`}>
        <ActionRow title="Guest list" detail="Names, motivation and extra field." action="Open" onClick={onShowRegistrations} />
        <ActionRow title="Waitlist" detail={`${waitlistCount} waiting. Seats are offered when someone leaves.`} action="Open" onClick={onShowWaitlist} />
        <ActionRow title="Email registrants" detail="Write one message to everyone who signed up." action="Write" onClick={onSendEmail} disabled={regCount === 0} />
      </SheetSection>

      <SheetSection title="Send entry codes">
        {qrConfirm ? (
          <div className="flex flex-wrap items-center gap-4 border-b border-night/20 py-4">
            <span className="text-[13px]">Send the QR code to {regCount} {regCount === 1 ? 'person' : 'people'}?</span>
            <span className="flex gap-2">
              <Pill solid onClick={() => { onSendQr(); setQrConfirm(false) }}>Yes, send</Pill>
              <Pill onClick={() => setQrConfirm(false)}>No</Pill>
            </span>
          </div>
        ) : (
          <ActionRow title="Send entry codes" detail="QR codes by email to everyone registered, sent by hand." action="Send" onClick={() => setQrConfirm(true)} disabled={regCount === 0} />
        )}
        <ActionRow title="Copy the event link" detail={`/events/${event.slug ?? ''}`} action={copied ? 'Copied' : 'Copy'} onClick={handleCopyLink} />
      </SheetSection>

      {/* The form: every field the event has */}
      <SheetSection title="Details" meta={`Extra field · ${extra}`}>
        <div className="grid gap-x-6 gap-y-5 pt-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Status *</label>
            <select value={form.status} onChange={e => set('status', e.target.value as UpcomingEvent['status'])} className={fieldCls}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Start time</label>
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>End time</label>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Aula Magna, Online" className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Description</label>
            <textarea rows={4} value={form.description} onChange={e => set('description', e.target.value)} className={`${fieldCls} resize-y`} />
          </div>
        </div>

        <h4 className="rd-eyebrow mt-9 text-[10px] text-night">Sign-up</h4>
        <div className="mt-3 grid gap-x-6 gap-y-5 border-t border-night/20 pt-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Action type</label>
            <select value={form.action_type} onChange={e => set('action_type', e.target.value)} className={fieldCls}>
              <option value="">— none —</option>
              {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {form.action_type === 'link' && (
            <div>
              <label className={labelCls}>Action link</label>
              <input value={form.action_link} onChange={e => set('action_link', e.target.value)} placeholder="https://..." className={fieldCls} />
            </div>
          )}
          <div className="sm:col-span-2">
            <div className={`${labelCls} mb-2`}>Extra field</div>
            <SegmentedPills
              size="sm"
              label="Registration field"
              options={[{ value: 'none', label: 'None' }, { value: 'motivation', label: 'Motivation' }, { value: 'panelists', label: 'Questions for the speaker' }]}
              value={form.registration_field ?? 'none'}
              onChange={v => { setSaved(false); setForm(prev => ({ ...prev, registration_field: v === 'none' ? null : v })) }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.members_only}
                onChange={e => { setSaved(false); setForm(prev => ({ ...prev, members_only: e.target.checked })) }}
                className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#1a4a3a]"
              />
              <span>
                <span className="rd-eyebrow block text-[10px] text-night">Members only</span>
                <span className="mt-1 block text-[11px] leading-[1.5] text-earth-600">
                  Only verified members (active membership) can register; everyone else sees &ldquo;Login to register&rdquo; / &ldquo;Members only&rdquo;. The check is also made on the server.
                </span>
              </span>
            </label>
          </div>
        </div>

        <h4 className="rd-eyebrow mt-9 text-[10px] text-night">Prices and seats</h4>
        <div className="mt-3 grid gap-x-6 gap-y-5 border-t border-night/20 pt-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Price for non-members (€)</label>
            <input type="number" min="0" step="0.01" value={form.ticket_price_eur} onChange={e => set('ticket_price_eur', e.target.value)} placeholder="empty or 0 = free" className={fieldCls} />
          </div>
          <div>
            <label className={labelCls}>Price for members (€)</label>
            <input type="number" min="0" step="0.01" value={form.member_price_eur} onChange={e => set('member_price_eur', e.target.value)} placeholder="empty = same price" className={fieldCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Seats</label>
            <input type="number" min="1" step="1" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="empty = unlimited" className={fieldCls} />
            <p className="mt-2 text-[11px] leading-[1.5] text-earth-600">
              {taken === null ? '' : `Seats taken now: ${taken}${form.capacity ? ` / ${form.capacity}` : ''} (registrations plus checkouts in progress). `}
              When the seats run out, sign-ups close and the event shows &ldquo;Sold out&rdquo; with the waitlist; if you raise the limit or a seat frees up it opens again.
            </p>
          </div>
        </div>

        <h4 className="rd-eyebrow mt-9 text-[10px] text-night">Address</h4>
        <div className="mt-3 border-t border-night/20 pt-5">
          <label className={labelCls}>Slug</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="made from the title if empty" className={fieldCls} />
          <p className="mt-2 text-[11px] text-earth-600">/events/{previewSlug}</p>
        </div>

        {error && <p role="alert" className="mt-6 border-l-2 border-[#8a2a1d] pl-3 text-[13px] text-[#8a2a1d]">{error}</p>}
        <div className="mt-8 flex items-center gap-4">
          <Pill solid onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Pill>
          {saved && !saving && <span className="rd-italic text-[18px] text-club">Saved</span>}
        </div>
      </SheetSection>

      <SheetSection title="Gallery">
        <div className="pt-5"><GalleryEditor eventId={event.id} /></div>
      </SheetSection>

      {/* Destructive action: last, and apart from everything else */}
      <section className="mt-14 border-t border-[#8a2a1d]/40 pt-6">
        <h3 className="rd-eyebrow text-[10px] text-[#8a2a1d]">Danger zone</h3>
        <p className="mt-2 max-w-[460px] text-[12px] leading-[1.6] text-earth-700">Deleting the event also removes its gallery. The registrations of the event cannot be recovered from here.</p>
        <div className="mt-4">
          {deleteConfirm ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-[#8a2a1d]">Delete &ldquo;{event.title}&rdquo; for good?</span>
              <button type="button" onClick={onDeleted} className={dangerBtn}>Yes, delete</button>
              <Pill onClick={() => setDeleteConfirm(false)}>Cancel</Pill>
            </div>
          ) : (
            <button type="button" onClick={() => setDeleteConfirm(true)} className={dangerBtn}>Delete event</button>
          )}
        </div>
      </section>
    </div>
  )
}

function EventRow({ ev, selected, muted, regCount, taken, onSelect }: {
  ev: UpcomingEvent
  selected: boolean
  muted: boolean
  regCount: number
  taken: number | null
  onSelect: () => void
}) {
  const d = new Date(ev.date + 'T00:00:00')
  const seats = ev.capacity ? `${taken ?? regCount} of ${ev.capacity} registered` : `${regCount} registered`
  const meta = [ev.members_only ? 'Members' : null, ev.location, seats].filter(Boolean).join(' · ')
  return (
    <li className={`border-b border-night/20 ${selected ? 'bg-night/[0.04]' : ''}`}>
      <button type="button" onClick={onSelect} aria-current={selected} className={`grid w-full grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-x-4 px-1 py-4 text-left transition-colors hover:bg-night/[0.03] ${muted ? 'opacity-65' : ''}`}>
        <span className="text-center">
          <span className="rd-display block text-[26px] leading-none">{String(d.getDate()).padStart(2, '0')}</span>
          <span className="rd-eyebrow mt-1 block text-[9px] text-earth-500">{MONTHS_SHORT[d.getMonth()]}</span>
        </span>
        <span className="min-w-0">
          <span className="rd-display block text-[22px] leading-[1.15]">{ev.title}</span>
          <span className="mt-1 block truncate text-[12px] text-earth-700">{meta}</span>
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <Pill size="sm" active={ev.status === 'open'}>{STATUS_LABEL[ev.status] ?? ev.status}</Pill>
          <span className="rd-italic text-[18px]">{selected ? 'Open' : 'Edit'}</span>
        </span>
      </button>
    </li>
  )
}

// ── Main Section ─────────────────────────────────────────────────────────────
export default function UpcomingEventsAdminSection({
  initialEvents,
}: {
  initialEvents: UpcomingEvent[]
}) {
  const today = new Date(new Date().toDateString())
  const [events, setEvents] = useState<UpcomingEvent[]>(initialEvents)
  const [selectedId, setSelectedId] = useState<string | null>(() => initialEvents.find(ev => new Date(ev.date) >= today)?.id ?? null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [regsModal, setRegsModal] = useState<UpcomingEvent | null>(null)
  const [emailEventTarget, setEmailEventTarget] = useState<{ event: UpcomingEvent } | null>(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [regIds, setRegIds] = useState<Record<string, string[]>>({})
  const [takenByEvent, setTakenByEvent] = useState<Record<string, number>>({})
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({})
  const [waitlistModal, setWaitlistModal] = useState<UpcomingEvent | null>(null)
  const [statusBusy, setStatusBusy] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const loadSeatInfo = useCallback(async () => {
    const supabase = createClient()
    const [{ data: avail }, { data: wl }] = await Promise.all([
      supabase.rpc('get_event_availability'),
      supabase.from('event_waitlist').select('event_id').eq('status', 'waiting'),
    ])
    const taken: Record<string, number> = {}
    for (const a of (avail ?? []) as { event_id: string; taken: number }[]) taken[a.event_id] = a.taken
    setTakenByEvent(taken)
    const counts: Record<string, number> = {}
    for (const w of (wl ?? []) as { event_id: string }[]) counts[w.event_id] = (counts[w.event_id] ?? 0) + 1
    setWaitlistCounts(counts)
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount: state is set after the request resolves
  useEffect(() => { void loadSeatInfo() }, [loadSeatInfo])

  const activeEvents = events.filter(ev => new Date(ev.date) >= today)
  const completedEvents = events.filter(ev => new Date(ev.date) < today)
  const nextId = activeEvents[0]?.id ?? null
  const selected = events.find(e => e.id === selectedId) ?? null

  // Fetch registration counts and ids for all events — unchanged query, only
  // the UI decides whether to render the full list (RegistrationsModal does
  // its own lazy fetch when opened).
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

  function handleSaved(saved: UpcomingEvent) {
    setEvents(prev => prev.map(e => (e.id === saved.id ? saved : e)))
  }

  function handleCreated(created: UpcomingEvent) {
    setEvents(prev => [...prev, created])
    setAddModalOpen(false)
    setSelectedId(created.id)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    // Clean up gallery storage objects first — event_images rows cascade
    // with the event, but the underlying storage files would otherwise
    // stay orphaned in the event-gallery bucket.
    const { data: images } = await supabase.from('event_images').select('id').eq('event_id', id)
    for (const img of images ?? []) {
      await fetch(`/api/admin/events/gallery?id=${img.id}`, { method: 'DELETE' })
    }
    await supabase.from('upcoming_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function handleQuickStatus(ev: UpcomingEvent, status: UpcomingEvent['status']) {
    const prev = ev.status
    setStatusBusy(ev.id)
    setEvents(list => list.map(e => (e.id === ev.id ? { ...e, status } : e)))
    const { error } = await createClient().from('upcoming_events').update({ status }).eq('id', ev.id)
    if (error) {
      setEvents(list => list.map(e => (e.id === ev.id ? { ...e, status: prev } : e)))
      alert(`Could not change the status: ${error.message}`)
    }
    setStatusBusy(null)
  }

  async function sendQr(ev: UpcomingEvent) {
    await fetch('/api/admin/crm/send-qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_ids: regIds[ev.id] ?? [] }),
    })
  }

  function copyLink(ev: UpcomingEvent) {
    const slug = ev.slug
    const url = slug
      ? `https://alatainvestmentclub.com/events/${slug}`
      : `https://alatainvestmentclub.com/events?register=${ev.id}`
    navigator.clipboard.writeText(url)
  }

  function select(id: string) {
    setSelectedId(id)
    // On narrow screens the sheet sits below the list: bring it into view.
    if (window.innerWidth < 1024) setTimeout(() => sheetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const row = (ev: UpcomingEvent, muted: boolean) => (
    <EventRow key={ev.id} ev={ev} muted={muted} selected={ev.id === selectedId} regCount={regCounts[ev.id] ?? 0} taken={takenByEvent[ev.id] ?? null} onSelect={() => select(ev.id)} />
  )

  return (
    <div>
      <div className="mb-8 flex justify-end">
        <Pill solid onClick={() => setAddModalOpen(true)}>New event</Pill>
      </div>

      <div className="grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <div>
          <SectionHeading flush title="Events" meta={`${events.length} total`} />
          <div>
            {activeEvents.length === 0 ? (
              <p className="py-8 text-[13px] text-earth-600">No upcoming events.</p>
            ) : (
              <ul>{activeEvents.map(ev => row(ev, false))}</ul>
            )}
          </div>

          {completedEvents.length > 0 && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setCompletedOpen(prev => !prev)}
                aria-expanded={completedOpen}
                className="flex w-full items-baseline justify-between border-b border-night py-3 text-left"
              >
                <span className="rd-italic text-[24px]">Completed</span>
                <span className="rd-eyebrow text-[10px] text-earth-500">{completedEvents.length} · {completedOpen ? 'Hide' : 'Show'}</span>
              </button>
              {completedOpen && <ul>{completedEvents.map(ev => row(ev, true))}</ul>}
            </div>
          )}
        </div>

        <div ref={sheetRef} className="scroll-mt-6 lg:sticky lg:top-6 lg:max-h-[calc(100svh-48px)] lg:self-start lg:overflow-y-auto lg:pr-1">
          {selected ? (
            <EventSheet
              key={selected.id}
              event={selected}
              isNext={selected.id === nextId}
              regCount={regCounts[selected.id] ?? 0}
              taken={takenByEvent[selected.id] ?? null}
              waitlistCount={waitlistCounts[selected.id] ?? 0}
              statusBusy={statusBusy === selected.id}
              onSaved={handleSaved}
              onDeleted={() => handleDelete(selected.id)}
              onStatus={st => void handleQuickStatus(selected, st)}
              onShowRegistrations={() => setRegsModal(selected)}
              onSendEmail={() => setEmailEventTarget({ event: selected })}
              onSendQr={() => sendQr(selected)}
              onCopyLink={() => copyLink(selected)}
              onShowWaitlist={() => setWaitlistModal(selected)}
            />
          ) : (
            <div>
              <h2 className="rd-italic pb-3 text-[clamp(28px,3vw,34px)]">Event</h2>
              <p className="border-t border-night py-8 text-[13px] text-earth-600">Choose an event from the list, or create a new one.</p>
            </div>
          )}
        </div>
      </div>

      {addModalOpen && (
        <AddEventModal onSave={handleCreated} onClose={() => setAddModalOpen(false)} />
      )}

      {regsModal && (
        <RegistrationsModal
          event={regsModal}
          onClose={() => setRegsModal(null)}
          onSendEmail={() => setEmailEventTarget({ event: regsModal })}
        />
      )}

      {waitlistModal && (
        <EventWaitlistAdmin
          event={waitlistModal}
          seatsLeft={
            waitlistModal.capacity == null
              ? null
              : Math.max(0, waitlistModal.capacity - (takenByEvent[waitlistModal.id] ?? 0))
          }
          onClose={() => setWaitlistModal(null)}
          onChanged={() => void loadSeatInfo()}
        />
      )}

      {emailEventTarget && (
        <ComposeModal
          event={emailEventTarget.event}
          onClose={() => setEmailEventTarget(null)}
        />
      )}
    </div>
  )
}
