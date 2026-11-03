'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { PageTitle, Pill, SegmentedPills, Tabs } from '@/app/components/member/ui'
import { createClient } from '@/lib/supabase'
import { TEAM_BADGE } from '../teamColors'
import MonthCalendar, { CLUB_EVENT, TEAM_DATE, type CalItem } from './MonthCalendar'

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  Instagram:  '#E1306C',
  LinkedIn:   '#0077B5',
  TikTok:     '#000000',
  YouTube:    '#FF0000',
  Newsletter: 'var(--forest)',
}

const CONTENT_TYPES: Record<string, string[]> = {
  Instagram:  ['Post', 'Reel', 'Story', 'Carosello'],
  LinkedIn:   ['Post', 'Articolo', 'Carosello'],
  TikTok:     ['Video'],
  YouTube:    ['Video', 'Short'],
  Newsletter: ['Newsletter'],
}

const PLATFORMS = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Newsletter']
const PED_STATUSES = ['draft', 'scheduled', 'published'] as const
// ── Types ─────────────────────────────────────────────────────────────────────

type UpcomingEventItem = {
  id: string
  date: string
  title: string
  description: string | null
  location: string | null
  start_time: string | null
  end_time: string | null
  status: string
  _source?: 'event' | 'task'
  _team?: string | null
}

type PedPost = {
  id: string
  title: string
  description: string | null
  team: string | null
  scheduled_date: string
  status: string
  platform: string | null
  content_type: string | null
  assigned_to: string | null
  notes: string | null
  attachment_url: string | null
  posted: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Tasks tab components ───────────────────────────────────────────────────────

// ── Mobile agenda (TasksTab only) ────────────────────────────────────────────

// ── TasksTab ──────────────────────────────────────────────────────────────────

function EventDetailModal({
  event, onClose, onDelete,
}: { event: UpcomingEventItem; onClose: () => void; onDelete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch(`/api/calendar/events/${event.id}`, { method: 'DELETE' })
    if (res.ok) { onDelete(event.id); onClose() }
    else setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex-1">
            {event._source === 'task' && (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 mb-2 inline-block"
                style={{ backgroundColor: event._team ? (TEAM_BADGE[event._team]?.bg ?? '#d97706') : '#d97706', color: '#fff' }}>
                Task · {event._team ?? 'team'}
              </span>
            )}
            <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug">{event.title}</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Data</p>
              <p className="text-ink-900">{fmtDate(event.date)}</p>
            </div>
            {(event.start_time || event.end_time) && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Orario</p>
                <p className="text-ink-900">
                  {event.start_time ?? '—'}{event.end_time ? ` → ${event.end_time}` : ''}
                </p>
              </div>
            )}
            {event.location && (
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Location</p>
                <p className="text-ink-900">{event.location}</p>
              </div>
            )}
            {event._source !== 'task' && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Status</p>
                <p className="text-ink-900">{event.status}</p>
              </div>
            )}
          </div>
          {event.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Descrizione</p>
              <p className="text-ink-900 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>
        {event._source !== 'task' && (
          <div className="px-6 pb-5 border-t border-[#e5e7eb] pt-3">
            {confirming ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink-500 flex-1">Delete this event?</span>
                <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs font-medium uppercase tracking-wide px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-40">
                  {deleting ? '…' : 'Yes, delete'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-ink-900 transition-colors">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="text-xs font-medium uppercase tracking-wide text-ink-400 hover:text-red-600 transition-colors">
                Delete event
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function NewEventModal({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (event: UpcomingEventItem) => void }) {
  const [date, setDate]             = useState('')
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [location, setLocation]     = useState('')
  const [startTime, setStartTime]   = useState('')
  const [endTime, setEndTime]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !title.trim() || saving) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, title: title.trim(), description: description.trim() || null, location: location.trim() || null, start_time: startTime || null, end_time: endTime || null }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setSaving(false); return }
    onCreated(json.data as UpcomingEventItem)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#e5e7eb]">
          <h2 className="font-serif text-xl font-bold text-ink-900">Nuovo evento</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Data *</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Descrizione</label>
            <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="Descrizione (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Ora inizio</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Ora fine</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving || !date || !title.trim()} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Create event'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EventiTab() {
  const [events, setEvents]                     = useState<UpcomingEventItem[]>([])
  const [loading, setLoading]                   = useState(true)
  const [selectedEvent, setSelectedEvent]       = useState<UpcomingEventItem | null>(null)
  const [showCreate, setShowCreate]             = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [evRes, taskRes] = await Promise.all([
        fetch('/api/calendar/events').then(r => r.json()),
        supabase
          .from('tasks')
          .select('id, title, due_date, description, team')
          .eq('is_event', true)
          .not('due_date', 'is', null),
      ])

      const upcoming: UpcomingEventItem[] = (evRes.data ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => ({ ...e, _source: 'event' as const })
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const taskEvents: UpcomingEventItem[] = ((taskRes.data ?? []) as any[]).map(t => ({
        id: t.id,
        date: t.due_date as string,
        title: t.title as string,
        description: t.description as string | null,
        location: null,
        start_time: null,
        end_time: null,
        status: 'task',
        _source: 'task' as const,
        _team: t.team as string | null,
      }))

      setEvents([...upcoming, ...taskEvents].sort((a, b) => a.date.localeCompare(b.date)))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="py-16 text-sm text-ink-500">Loading...</div>

  const items: CalItem[] = events.map(ev => {
    const isTask = ev._source === 'task'
    return {
      id: ev.id,
      date: ev.date,
      title: ev.title,
      meta: isTask
        ? ['Team date', ev._team].filter(Boolean).join(' · ')
        : [ev.start_time, ev.location].filter(Boolean).join(' · ') || 'Club event',
      color: isTask ? TEAM_DATE : CLUB_EVENT,
    }
  })

  return (
    <div>
      <div className="mb-8 flex justify-end">
        <Pill solid onClick={() => setShowCreate(true)}>New event</Pill>
      </div>

      <MonthCalendar
        items={items}
        legend={[{ label: 'Club event', color: CLUB_EVENT }, { label: 'Team date', color: TEAM_DATE }]}
        onPick={id => setSelectedEvent(events.find(e => e.id === id) ?? null)}
        emptyText="No club events or team dates coming up."
      />

      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} onDelete={id => setEvents(prev => prev.filter(e => e.id !== id))} />
      )}
      {showCreate && (
        <NewEventModal onClose={() => setShowCreate(false)} onCreated={ev => setEvents(prev => [...prev, ev].sort((a, b) => a.date.localeCompare(b.date)))} />
      )}
    </div>
  )
}

// ── PedTab ────────────────────────────────────────────────────────────────────

function PostedCheckbox({
  posted, disabled, onChange,
}: { posted: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <input
      type="checkbox"
      checked={posted}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
      aria-label={posted ? 'Segna come non postato' : 'Segna come postato'}
      className="w-4 h-4 accent-forest cursor-pointer disabled:opacity-50"
    />
  )
}

function PedDetailModal({
  post, onClose, onTogglePosted, togglingPosted,
}: { post: PedPost; onClose: () => void; onTogglePosted: (id: string, next: boolean) => void; togglingPosted: boolean }) {
  const platformColor = post.platform ? (PLATFORM_COLORS[post.platform] ?? '#1a4a3a') : 'var(--forest)'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#e5e7eb]">
          <div className="flex-1">
            {post.platform && (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 mb-2 inline-block" style={{ backgroundColor: platformColor, color: '#fff' }}>
                {post.platform}{post.content_type ? ` · ${post.content_type}` : ''}
              </span>
            )}
            <h3 className="font-serif text-lg font-bold text-ink-900 leading-snug">{post.title}</h3>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1 flex-shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Data</p>
              <p className="text-ink-900">{fmtDate(post.scheduled_date)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Status</p>
              <p className="text-ink-900">{post.status}</p>
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <PostedCheckbox posted={post.posted} disabled={togglingPosted} onChange={next => onTogglePosted(post.id, next)} />
                <span className="text-[10px] uppercase tracking-widest text-ink-400">{post.posted ? 'Postato' : 'Non postato'}</span>
              </label>
            </div>
            {post.assigned_to && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Assigned to</p>
                <p className="text-ink-900">{post.assigned_to}</p>
              </div>
            )}
          </div>
          {post.description && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Descrizione</p>
              <p className="text-ink-900 whitespace-pre-wrap">{post.description}</p>
            </div>
          )}
          {post.notes && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Note</p>
              <p className="text-ink-900 whitespace-pre-wrap">{post.notes}</p>
            </div>
          )}
          {post.attachment_url && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-400 mb-0.5">Allegato</p>
              <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" className="text-forest underline text-sm">Visualizza allegato</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NewPedModal({
  existingAssignees, onClose, onCreated,
}: { existingAssignees: string[]; onClose: () => void; onCreated: (post: PedPost) => void }) {
  const [scheduledDate, setDate]    = useState('')
  const [title, setTitle]           = useState('')
  const [platform, setPlatform]     = useState('')
  const [contentType, setContentType] = useState('')
  const [description, setDesc]      = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [notes, setNotes]           = useState('')
  const [file, setFile]             = useState<File | null>(null)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [acOpen, setAcOpen]         = useState(false)

  const acSuggestions = existingAssignees.filter(a => a && a.toLowerCase().includes(assignedTo.toLowerCase()) && a !== assignedTo)

  const availableContentTypes = platform ? (CONTENT_TYPES[platform] ?? []) : []

  function handlePlatformChange(p: string) {
    setPlatform(p)
    setContentType('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!scheduledDate || !title.trim() || saving) return
    setSaving(true)
    setError(null)

    let attachmentUrl: string | null = null
    if (file) {
      const supabase = createClient()
      const path = `ped/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
      const buckets = ['post-plans-attachments', 'admin-archive']
      for (const bucket of buckets) {
        const { data, error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
        if (!upErr && data) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
          attachmentUrl = urlData.publicUrl
          break
        }
      }
    }

    const res = await fetch('/api/ped', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        scheduled_date: scheduledDate,
        platform: platform || null,
        content_type: contentType || null,
        description: description.trim() || null,
        assigned_to: assignedTo.trim() || null,
        notes: notes.trim() || null,
        attachment_url: attachmentUrl,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Error'); setSaving(false); return }
    onCreated(json.data as PedPost)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="relative z-[60] bg-white w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#e5e7eb] flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">Nuova entry PED</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Data *</label>
            <input required type="date" value={scheduledDate} onChange={e => setDate(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Piattaforma</label>
            <div className="relative">
              <select value={platform} onChange={e => handlePlatformChange(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest appearance-none">
                <option value="">Seleziona piattaforma</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </div>
          </div>
          {platform && availableContentTypes.length > 0 && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Tipo Contenuto</label>
              <div className="relative">
                <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest appearance-none">
                  <option value="">Seleziona tipo</option>
                  {availableContentTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Descrizione</label>
            <textarea rows={3} value={description} onChange={e => setDesc(e.target.value)} placeholder="Descrizione (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none" />
          </div>
          <div className="relative">
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Assigned to</label>
            <input
              value={assignedTo}
              onChange={e => { setAssignedTo(e.target.value); setAcOpen(true) }}
              onFocus={() => setAcOpen(true)}
              onBlur={() => setTimeout(() => setAcOpen(false), 150)}
              placeholder="Nome (opzionale)"
              className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
            {acOpen && acSuggestions.length > 0 && (
              <div className="absolute z-10 top-full left-0 right-0 bg-white border border-[#e5e7eb] shadow-md max-h-32 overflow-y-auto">
                {acSuggestions.map(s => (
                  <button key={s} type="button" onMouseDown={() => { setAssignedTo(s); setAcOpen(false) }} className="w-full text-left px-3 py-2 text-sm hover:bg-paper-stone">{s}</button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Note</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note (opzionale)" className="w-full border border-[#e5e7eb] px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-ink-400 mb-1">Allegato</label>
            <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-ink-600 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-xs file:font-medium file:uppercase file:tracking-wide file:bg-forest file:text-white hover:file:bg-[#123a2d]" />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving || !scheduledDate || !title.trim()} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Create entry'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PedTab() {
  const [posts, setPosts]             = useState<PedPost[]>([])
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState<'calendar' | 'list'>('calendar')
  const [selectedPost, setSelectedPost] = useState<PedPost | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [togglingPosted, setTogglingPosted] = useState<string | null>(null)
  const [confirmDel, setConfirmDel]   = useState<string | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/ped')
      .then(r => r.json())
       
      .then(json => setPosts((json.data ?? []) as PedPost[]))
      .finally(() => setLoading(false))
  }, [])

  const pedItems: CalItem[] = posts.map(p => ({
    id: p.id,
    date: p.scheduled_date,
    title: p.title,
    meta: [p.platform, p.content_type, p.posted ? 'Posted' : p.status].filter(Boolean).join(' · '),
    color: p.platform ? (PLATFORM_COLORS[p.platform] ?? CLUB_EVENT) : CLUB_EVENT,
    muted: p.posted,
  }))

  const existingAssignees = useMemo(() =>
    Array.from(new Set(posts.map(p => p.assigned_to).filter(Boolean))) as string[]
  , [posts])

  async function handleStatusChange(id: string, status: string) {
    setUpdatingStatus(id)
    const res = await fetch(`/api/ped/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setUpdatingStatus(null)
  }

  async function handleTogglePosted(id: string, next: boolean) {
    setTogglingPosted(id)
    const res = await fetch(`/api/ped/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posted: next }),
    })
    if (res.ok) setPosts(prev => prev.map(p => p.id === id ? { ...p, posted: next } : p))
    setTogglingPosted(null)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/ped/${id}`, { method: 'DELETE' })
    if (res.ok) { setPosts(prev => prev.filter(p => p.id !== id)); setConfirmDel(null) }
    setDeleting(null)
  }

  if (loading) return <div className="py-16 text-sm text-ink-500">Loading...</div>

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <SegmentedPills options={[{ value: 'calendar', label: 'Calendar' }, { value: 'list', label: 'List' }]} value={view} onChange={setView} label="View" />
        <Pill solid onClick={() => setShowCreate(true)}>New entry</Pill>
      </div>

      {view === 'calendar' ? (
        <>
          <MonthCalendar
            items={pedItems}
            legend={PLATFORMS.map(p => ({ label: p, color: PLATFORM_COLORS[p] }))}
            onPick={id => setSelectedPost(posts.find(p => p.id === id) ?? null)}
            comingUpTitle="Next posts"
            emptyText="No posts scheduled."
          />
        </>
      ) : (
        /* Lista view */
        <div>
          {posts.length === 0 ? (
            <p className="text-sm text-ink-500 py-8">No entries in the editorial plan.</p>
          ) : (
            <div className="border border-[#e5e7eb]">
              {/* Header row */}
              <div className="grid grid-cols-[120px_1fr_110px_110px_130px_110px_80px_80px] border-b border-[#e5e7eb] bg-[#f9f9f9]">
                {['Date', 'Title', 'Platform', 'Type', 'Assigned to', 'Status', 'Posted', ''].map(h => (
                  <div key={h} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink-400">{h}</div>
                ))}
              </div>
              {posts.map(p => {
                const color = p.platform ? (PLATFORM_COLORS[p.platform] ?? '#1a4a3a') : 'var(--forest)'
                return (
                  <div key={p.id} className="grid grid-cols-[120px_1fr_110px_110px_130px_110px_80px_80px] border-b border-[#e5e7eb] last:border-b-0 hover:bg-paper-cool items-center">
                    <div className="px-3 py-3 text-xs text-ink-600">{fmtDate(p.scheduled_date)}</div>
                    <button type="button" onClick={() => setSelectedPost(p)} className="px-3 py-3 text-sm font-medium text-ink-900 text-left hover:text-forest transition-colors truncate">
                      {p.title}
                    </button>
                    <div className="px-3 py-3">
                      {p.platform ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 text-white" style={{ backgroundColor: color }}>{p.platform}</span>
                      ) : <span className="text-ink-400">—</span>}
                    </div>
                    <div className="px-3 py-3 text-xs text-ink-600">{p.content_type ?? '—'}</div>
                    <div className="px-3 py-3 text-xs text-ink-600 truncate">{p.assigned_to ?? '—'}</div>
                    <div className="px-3 py-3">
                      <div className="relative">
                        <select
                          value={p.status}
                          disabled={updatingStatus === p.id}
                          onChange={e => handleStatusChange(p.id, e.target.value)}
                          className="text-xs font-medium uppercase tracking-wide border border-[#e5e7eb] px-2 py-1 bg-white focus:outline-none focus:border-forest appearance-none pr-5 disabled:opacity-50 w-full"
                        >
                          {PED_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </div>
                      </div>
                    </div>
                    <div className="px-3 py-3 flex items-center">
                      <PostedCheckbox posted={p.posted} disabled={togglingPosted === p.id} onChange={next => handleTogglePosted(p.id, next)} />
                    </div>
                    <div className="px-3 py-3 flex items-center justify-end">
                      {confirmDel === p.id ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} className="text-[10px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-40">
                            {deleting === p.id ? '…' : 'Yes'}
                          </button>
                          <span className="text-ink-300">/</span>
                          <button type="button" onClick={() => setConfirmDel(null)} className="text-[10px] text-ink-400 hover:text-ink-700">No</button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setConfirmDel(p.id)} className="p-1 text-ink-300 hover:text-red-500 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedPost && (() => {
        const current = posts.find(p => p.id === selectedPost.id) ?? selectedPost
        return (
          <PedDetailModal
            post={current}
            onClose={() => setSelectedPost(null)}
            onTogglePosted={handleTogglePosted}
            togglingPosted={togglingPosted === current.id}
          />
        )
      })()}
      {showCreate && (
        <NewPedModal
          existingAssignees={existingAssignees}
          onClose={() => setShowCreate(false)}
          onCreated={post => {
            setPosts(prev => [...prev, post].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)))
            setShowCreate(false)
          }}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function CalendarTabs() {
  const params = useSearchParams()
  const [activeTab, setActiveTab] = useState<'eventi' | 'ped'>(params.get('view') === 'ped' ? 'ped' : 'eventi')

  return (
    <>
      <PageTitle
        title="Calendar"
        sub={activeTab === 'ped' ? 'The editorial plan, separate from events.' : 'Club events and your team’s dates.'}
      />
      <div className="mb-8 mt-6">
        <Tabs tabs={[{ key: 'eventi', label: 'Club' }, { key: 'ped', label: 'PED' }]} value={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === 'eventi' ? <EventiTab /> : <PedTab />}
    </>
  )
}

// Two separate calendars (boards ACld / APdd): Club (events and team dates)
// and PED (the editorial plan). The task view left with the tasks.
export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarTabs />
    </Suspense>
  )
}
