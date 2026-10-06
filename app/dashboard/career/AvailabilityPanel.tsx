'use client'

import { useState, useEffect } from 'react'
import {
  inputCls, labelCls, btnPrimary, DOW_BUTTONS, DOW_NAMES, formatDate,
  TrashIcon, ConfirmDelete, type MentorLite,
} from './ui'

type Availability = {
  id: string
  mentor_id: string | null
  type: 'recurring' | 'one_time'
  day_of_week: number | null
  date: string | null
  start_time: string
  end_time: string | null
  active: boolean
}

type AvailForm = {
  type: 'recurring' | 'one_time'
  date: string
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

const EMPTY_AVAIL: AvailForm = {
  type: 'recurring', date: '', day_of_week: 1, start_time: '', end_time: '', active: true,
}

/**
 * Availability windows of ONE mentor, split into 30-minute sessions on the public
 * page. With `fixedMentorId` (the /me page) the mentor is the logged-in one; without
 * it (staff) a selector picks the mentor. All reads and writes go through
 * /api/career/availability, which enforces who may touch which mentor.
 */
export default function AvailabilityPanel({
  mentors,
  fixedMentorId,
}: {
  mentors: MentorLite[]
  fixedMentorId?: string
}) {
  const [mentorId, setMentorId]     = useState(fixedMentorId ?? mentors[0]?.id ?? '')
  const [rows, setRows]             = useState<Availability[]>([])
  const [loading, setLoading]       = useState(false)
  const [form, setForm]             = useState<AvailForm>(EMPTY_AVAIL)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    if (!mentorId) return
    setLoading(true)
    fetch(`/api/career/availability?mentor_id=${encodeURIComponent(mentorId)}`)
      .then(r => r.json())
      .then(json => { setRows((json.data ?? []) as Availability[]); setLoading(false) })
      .catch(() => setLoading(false))
  }, [mentorId])

  async function toggleActive(a: Availability) {
    const res = await fetch('/api/career/availability', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, active: !a.active }) })
    const json = await res.json()
    if (res.ok && json.data) setRows(prev => prev.map(x => x.id === a.id ? (json.data as Availability) : x))
  }

  async function deleteRow(id: string) {
    setDeleting(true)
    const res = await fetch('/api/career/availability', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setRows(prev => prev.filter(x => x.id !== id))
    setConfirmDel(null); setDeleting(false)
  }

  async function saveSlot() {
    if (!mentorId) return
    if (!form.start_time || !form.end_time) { setError('Start and end time are required'); return }
    if (form.end_time <= form.start_time) { setError('End time must be after start time'); return }
    if (form.type === 'one_time' && !form.date) { setError('Date is required'); return }
    setSaving(true); setError(null)

    const payload = {
      mentor_id: mentorId,
      type: form.type,
      start_time: form.start_time,
      end_time: form.end_time,
      active: form.active,
      day_of_week: form.type === 'recurring' ? form.day_of_week : null,
      date: form.type === 'one_time' ? form.date : null,
    }

    const res = await fetch('/api/career/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Insert failed'); setSaving(false); return }
    setRows(prev => [...prev, json.data as Availability])
    setForm(EMPTY_AVAIL); setSaving(false)
  }

  return (
    <div>
      {!fixedMentorId && (
        <div className="mb-6 max-w-xs">
          <label className={labelCls}>Mentor</label>
          <div className="relative">
            <select value={mentorId} onChange={e => setMentorId(e.target.value)}
              className={`${inputCls} appearance-none pr-8`}>
              {mentors.length === 0 && <option value="">No mentors</option>}
              {mentors.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mb-4">
        Each window is split into 30-minute sessions that visitors can book.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400 mb-6">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-5 border border-dashed border-gray-200 text-center mb-6">
          No availability yet: this mentor cannot be booked until a slot is added.
        </p>
      ) : (
        <div className="border border-gray-200 mb-6">
          {rows.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-3 px-5 py-3 bg-white hover:bg-[#fafaf9] transition-colors ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${a.type === 'one_time' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {a.type === 'one_time' ? 'One-Time' : 'Recurring'}
                </span>
                <span className="text-sm text-gray-700 font-medium">
                  {a.type === 'one_time'
                    ? (a.date ? formatDate(a.date) : '—')
                    : (a.day_of_week !== null ? DOW_NAMES[a.day_of_week] : '—')}
                </span>
                <span className="text-sm text-gray-500">
                  {a.start_time?.slice(0, 5)}{a.end_time ? ` – ${a.end_time.slice(0, 5)}` : ''}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${a.active ? 'bg-forest text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {a.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(a)} title={a.active ? 'Deactivate' : 'Activate'}
                  className="p-1.5 text-gray-400 hover:text-forest transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d={a.active
                        ? 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21'
                        : 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'}
                    />
                  </svg>
                </button>
                {confirmDel === a.id ? (
                  <ConfirmDelete onConfirm={() => deleteRow(a.id)} onCancel={() => setConfirmDel(null)} busy={deleting} />
                ) : (
                  <button onClick={() => setConfirmDel(a.id)} title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Slot Form */}
      <div className="border border-forest/30 bg-[#f9f9f8] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-forest mb-4">Add Slot</p>

        <div className="mb-4">
          <label className={labelCls}>Type</label>
          <div className="flex border border-gray-200 max-w-xs">
            {(['recurring', 'one_time'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors border-r border-gray-200 last:border-r-0 ${form.type === t ? 'bg-forest text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t === 'recurring' ? 'Recurring' : 'One-Time'}
              </button>
            ))}
          </div>
        </div>

        {form.type === 'one_time' ? (
          <div className="mb-4 max-w-xs">
            <label className={labelCls}>Date</label>
            <input type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
        ) : (
          <div className="mb-4">
            <label className={labelCls}>Day of Week</label>
            <div className="flex gap-1.5 flex-wrap">
              {DOW_BUTTONS.map(({ label, value }) => (
                <button key={value} type="button"
                  onClick={() => setForm(f => ({ ...f, day_of_week: value }))}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border transition-colors ${form.day_of_week === value ? 'bg-forest text-white border-forest' : 'border-gray-200 text-gray-600 hover:border-forest'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4 max-w-sm">
          <div>
            <label className={labelCls}>Start time *</label>
            <input type="time" value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End time *</label>
            <input type="time" value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" id="avail-active" checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            className="accent-forest w-3.5 h-3.5" />
          <label htmlFor="avail-active" className="text-sm text-gray-700">Active</label>
        </div>

        {error && <p className="mb-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
        <button onClick={saveSlot} disabled={saving || !mentorId} className={btnPrimary}>
          {saving ? 'Saving…' : 'Save Slot'}
        </button>
      </div>
    </div>
  )
}
