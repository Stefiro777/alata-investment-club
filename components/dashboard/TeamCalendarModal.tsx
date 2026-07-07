'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export type TeamCalendarEvent = {
  id: string
  team: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  start_time: string | null
  end_time: string | null
  created_by: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  mode: 'create' | 'edit'
  initialDate?: string
  event?: TeamCalendarEvent
  currentTeam: string
  currentMember: { id: string; role: string; email: string } | null
  existingEventsOnDate: TeamCalendarEvent[]
}

export default function TeamCalendarModal({
  isOpen,
  onClose,
  onSave,
  mode,
  initialDate,
  event,
  currentTeam,
  currentMember,
  existingEventsOnDate,
}: Props) {
  const [title, setTitle]         = useState(event?.title ?? '')
  const [description, setDesc]    = useState(event?.description ?? '')
  const [startDate, setStartDate] = useState(event?.start_date ?? initialDate ?? '')
  const [endDate, setEndDate]     = useState(event?.end_date ?? initialDate ?? '')
  const [startTime, setStartTime] = useState(event?.start_time ?? '')
  const [endTime, setEndTime]     = useState(event?.end_time ?? '')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  if (!isOpen) return null

  const canDelete =
    mode === 'edit' &&
    event &&
    currentMember &&
    (currentMember.id === event.created_by ||
      currentMember.role === 'bod' ||
      currentMember.role === 'director')

  const conflictEvents = existingEventsOnDate.filter(e => e.team !== currentTeam)

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    if (!title.trim() || saving || !currentMember) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate || startDate,
      start_time: startTime || null,
      end_time: endTime || null,
    }
    if (mode === 'create') {
      await supabase.from('team_calendar').insert({
        ...payload,
        team: currentTeam,
        created_by: currentMember.id,
      })
    } else if (event) {
      await supabase.from('team_calendar').update(payload).eq('id', event.id)
    }
    setSaving(false)
    onSave()
    onClose()
  }

  async function handleDelete() {
    if (!event || deleting) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('team_calendar').delete().eq('id', event.id)
    setDeleting(false)
    onSave()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-['Cormorant_Garamond',serif] text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'New Event' : 'Edit Event'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {conflictEvents.length > 0 && (
          <div className="mx-6 mt-4 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
            ⚠ Another team has an event on this date
          </div>
        )}

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Title *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full border border-gray-200 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Optional description..."
              className="w-full border border-gray-200 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Start date *</label>
              <input
                required
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value) }}
                className="w-full border border-gray-200 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">End date</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-400 mb-1">End time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full border border-gray-200 px-3 py-2 text-sm font-['Inter'] focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {canDelete && (
                confirmDel ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="text-sm font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
                    >
                      {deleting ? '…' : 'Yes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDel(false)}
                      className="text-sm text-gray-400 hover:text-gray-700"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDel(true)}
                    className="text-xs font-medium uppercase tracking-wide text-red-400 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                )
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-900 font-['Inter']"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-4 py-2 transition-colors disabled:opacity-40"
              >
                {saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
