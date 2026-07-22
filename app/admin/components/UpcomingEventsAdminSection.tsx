'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
    slug: ev.slug ?? '',
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formToPayload(form: FormState) {
  const ticketCents = form.ticket_price_eur ? Math.round(parseFloat(form.ticket_price_eur) * 100) : null
  const memberCents = form.member_price_eur ? Math.round(parseFloat(form.member_price_eur) * 100) : null
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
    slug: (form.slug.trim() || slugify(form.title)) || null,
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
                  [Nome] will be replaced with each registrant&apos;s first name.
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
      <label className="block text-xs font-medium text-ink-500 uppercase tracking-wide mb-2">Gallery</label>
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

// ── Accordion row (edit form + actions) ──────────────────────────────────────
function EventAccordion({
  event,
  regCount,
  onSaved,
  onDeleted,
  onShowRegistrations,
  onSendEmail,
  onSendQr,
  onCopyLink,
}: {
  event: UpcomingEvent
  regCount: number
  onSaved: (ev: UpcomingEvent) => void
  onDeleted: () => void
  onShowRegistrations: () => void
  onSendEmail: () => void
  onSendQr: () => void
  onCopyLink: () => void
}) {
  const [form, setForm] = useState<FormState>(() => eventToForm(event))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrConfirm, setQrConfirm] = useState(false)

  function set(key: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    if (!form.date || !form.title.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('upcoming_events')
      .update(formToPayload(form))
      .eq('id', event.id)
      .select('*')
      .single()
    if (err) {
      setError(err.code === '23505' ? 'That slug is already taken by another event.' : err.message)
      setSaving(false)
      return
    }
    onSaved(data as UpcomingEvent)
    setSaving(false)
  }

  function handleCopyLink() {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputClass =
    'w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors'
  const labelClass = 'block text-xs font-medium text-ink-500 uppercase tracking-wide mb-1'
  const previewSlug = form.slug.trim() || slugify(form.title) || 'event-slug'

  return (
    <div className="p-6 space-y-6" onClick={e => e.stopPropagation()}>
      {/* Actions bar */}
      <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-line-faint">
        <span className="text-xs text-ink-500 mr-1">
          {regCount} registrant{regCount !== 1 ? 's' : ''}
        </span>
        <button
          onClick={onShowRegistrations}
          className="border border-[#6b7280] text-ink-500 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          Show all
        </button>
        {regCount > 0 && (
          <button
            onClick={onSendEmail}
            title="Send email to registrants"
            className="flex items-center gap-1.5 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <EnvelopeIcon /> Email
          </button>
        )}
        {regCount > 0 && (
          qrConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-ink-500 whitespace-nowrap">Send QR to {regCount}?</span>
              <button onClick={() => { onSendQr(); setQrConfirm(false) }}
                className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors">Yes</button>
              <button onClick={() => setQrConfirm(false)}
                className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors">No</button>
            </div>
          ) : (
            <button
              onClick={() => setQrConfirm(true)}
              title="Send QR codes to all registrants"
              className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              Send QR
            </button>
          )
        )}
        <button
          onClick={handleCopyLink}
          className="border border-[#6b7280] text-ink-500 hover:bg-[#6b7280] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors"
        >
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
        <div className="ml-auto">
          {deleteConfirm ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600">Sure?</span>
              <button onClick={onDeleted} className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors">Yes</button>
              <button onClick={() => setDeleteConfirm(false)} className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors">No</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-3 py-1.5 transition-colors">
              Delete event
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClass}>Title *</label>
          <input required value={form.title} onChange={e => set('title', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date *</label>
          <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Status *</label>
          <select value={form.status} onChange={e => set('status', e.target.value as UpcomingEvent['status'])} className={inputClass}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Start time</label>
          <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>End time</label>
          <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Location</label>
          <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Aula Magna, Online" className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className={`${inputClass} resize-none`} />
        </div>

        <div>
          <label className={labelClass}>Action Type</label>
          <select value={form.action_type} onChange={e => set('action_type', e.target.value)} className={inputClass}>
            <option value="">— none —</option>
            {ACTION_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {form.action_type === 'link' && (
          <div>
            <label className={labelClass}>Action Link</label>
            <input value={form.action_link} onChange={e => set('action_link', e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
        )}

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-2">Registration Field</label>
          <div className="flex gap-2">
            {(['motivation', 'panelists', 'none'] as const).map(opt => {
              const value = opt === 'none' ? null : opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, registration_field: value }))}
                  className={`text-xs font-medium tracking-wide px-4 py-2 border transition-colors duration-fast ${
                    form.registration_field === value
                      ? 'bg-forest text-white border-forest'
                      : 'bg-white text-ink-500 border-line hover:border-forest hover:text-forest'
                  }`}
                >
                  {opt === 'motivation' ? 'Motivation' : opt === 'panelists' ? 'Questions for Panelists' : 'None'}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className={labelClass}>Prezzo non-member (€)</label>
          <input type="number" min="0" step="0.01" value={form.ticket_price_eur}
            onChange={e => set('ticket_price_eur', e.target.value)} placeholder="0.00 = free" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prezzo member (€)</label>
          <input type="number" min="0" step="0.01" value={form.member_price_eur}
            onChange={e => set('member_price_eur', e.target.value)} placeholder="vuoto = stesso prezzo" className={inputClass} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Slug</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="generato automaticamente dal titolo se vuoto" className={inputClass} />
          <p className="text-[11px] text-ink-400 mt-1">/events/{previewSlug}</p>
        </div>
      </div>

      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

      <div className="flex justify-end pt-2 border-t border-black/5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '…' : 'Save'}
        </button>
      </div>

      <div className="pt-4 border-t border-line-faint">
        <GalleryEditor eventId={event.id} />
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
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [regsModal, setRegsModal] = useState<UpcomingEvent | null>(null)
  const [emailEventTarget, setEmailEventTarget] = useState<{ event: UpcomingEvent; recipientCount: number } | null>(null)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [regIds, setRegIds] = useState<Record<string, string[]>>({})

  const today = new Date(new Date().toDateString())
  const activeEvents = events.filter(ev => new Date(ev.date) >= today)
  const completedEvents = events.filter(ev => new Date(ev.date) < today)

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
    if (expandedId === id) setExpandedId(null)
  }

  function openEmailCompose(ev: UpcomingEvent) {
    setEmailEventTarget({ event: ev, recipientCount: regCounts[ev.id] ?? 0 })
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

  function renderRows(list: UpcomingEvent[], muted: boolean) {
    return list.map(ev => {
      const isExpanded = expandedId === ev.id
      const badge = (
        <span className={`text-[10px] font-medium tracking-widest uppercase px-2 py-1 whitespace-nowrap ${
          muted ? 'border border-gray-300 text-gray-400' :
          ev.status === 'open' ? 'bg-forest text-white' : 'border border-forest text-forest'
        }`}>
          {ev.status.replace('_', ' ')}
        </span>
      )
      return (
        <div key={ev.id} className="border-b border-black/5 last:border-0">
          <div
            onClick={() => setExpandedId(isExpanded ? null : ev.id)}
            className={`px-4 py-3 cursor-pointer hover:bg-paper-cool transition-colors min-h-[44px] ${muted ? 'opacity-70' : ''}`}
          >
            {/* Mobile: stacked layout — title on its own line, date+status+chevron below */}
            <div className="flex sm:hidden flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm font-medium leading-snug ${muted ? 'text-ink-500' : 'text-ink-900'}`}>{ev.title}</span>
                <span className={`text-ink-400 text-xs shrink-0 transition-transform mt-0.5 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs whitespace-nowrap ${muted ? 'text-ink-500' : 'text-ink-500'}`}>{ev.date}</span>
                {badge}
              </div>
            </div>

            {/* Desktop: single-line grid */}
            <div className="hidden sm:grid sm:grid-cols-[110px_1fr_140px_24px] sm:items-center sm:gap-4">
              <span className={`font-medium whitespace-nowrap text-sm ${muted ? 'text-ink-500' : 'text-ink-900'}`}>{ev.date}</span>
              <span className={`text-sm truncate ${muted ? 'text-ink-500' : 'text-ink-900'}`} title={ev.title}>{ev.title}</span>
              <span>{badge}</span>
              <span className={`text-ink-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </div>
          {isExpanded && (
            <EventAccordion
              event={ev}
              regCount={regCounts[ev.id] ?? 0}
              onSaved={handleSaved}
              onDeleted={() => handleDelete(ev.id)}
              onShowRegistrations={() => setRegsModal(ev)}
              onSendEmail={() => openEmailCompose(ev)}
              onSendQr={() => sendQr(ev)}
              onCopyLink={() => copyLink(ev)}
            />
          )}
        </div>
      )
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <SectionHeading title="Upcoming Events" />

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setAddModalOpen(true)}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2.5 transition-colors duration-fast"
        >
          + Add Event
        </button>
      </div>

      <div className="bg-white border border-line-faint">
        <div className="hidden sm:grid sm:grid-cols-[110px_1fr_140px_24px] gap-4 px-4 py-3 border-b border-line-faint bg-[#f9f9f9] text-xs font-medium text-ink-500 uppercase tracking-wide">
          <span>Date</span><span>Title</span><span>Status</span><span />
        </div>
        {activeEvents.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-10">No upcoming events.</p>
        ) : (
          renderRows(activeEvents, false)
        )}
      </div>

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
            <div className="bg-white border border-t-0 border-[#e5e7eb]">
              {renderRows(completedEvents, true)}
            </div>
          )}
        </div>
      )}

      {addModalOpen && (
        <AddEventModal onSave={handleCreated} onClose={() => setAddModalOpen(false)} />
      )}

      {regsModal && (
        <RegistrationsModal
          event={regsModal}
          onClose={() => setRegsModal(null)}
          onSendEmail={(count) => setEmailEventTarget({ event: regsModal, recipientCount: count })}
        />
      )}

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
