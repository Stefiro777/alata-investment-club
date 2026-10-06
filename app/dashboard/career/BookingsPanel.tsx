'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  labelCls, formatDate, statusBadgeCls, statusLabel, ChevronIcon, type MentorLite,
} from './ui'

type Booking = {
  id: string
  /** Set on bookings made when sessions were tied to a service (legacy). */
  service_name: string | null
  mentor_id: string | null
  mentor_name: string | null
  slot_date: string
  slot_time: string
  name: string
  email: string
  motivation: string
  goal: string
  cv_url: string | null
  status: 'pending_payment' | 'confirmed' | 'cancelled'
  is_member_free: boolean
  stripe_payment_intent_id: string | null
  created_at: string
}

/**
 * Bookings list. Staff (`staff`) see every mentor's bookings, can set any status and
 * delete; a mentor (/me) gets only their own from the API, can only cancel, and
 * cannot delete. The API enforces this too: the flags here only shape the UI.
 */
export default function BookingsPanel({
  mentors,
  fixedMentorId,
  staff,
}: {
  mentors: MentorLite[]
  fixedMentorId?: string
  staff: boolean
}) {
  const [bookings, setBookings]     = useState<Booking[]>([])
  const [loading, setLoading]       = useState(true)
  const [mentFilter, setMentFilter] = useState('all')
  const [statFilter, setStatFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmDelId, setConfirmDelId] = useState<string | null>(null)
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [pastOpen, setPastOpen]     = useState(false)

  async function fetchBookings() {
    const qs = fixedMentorId ? `?mentor_id=${encodeURIComponent(fixedMentorId)}` : ''
    const res = await fetch(`/api/career/bookings${qs}`)
    const json = await res.json()
    setBookings((json.data ?? []) as Booking[])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [fixedMentorId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteBooking(id: string) {
    setDeletingId(id)
    const res = await fetch(`/api/career/bookings/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setBookings(prev => prev.filter(b => b.id !== id))
      setExpandedId(null)
    }
    setConfirmDelId(null)
    setDeletingId(null)
  }

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id); setStatusError(null)
    const res = await fetch(`/api/career/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const json = await res.json()
      setStatusError(json.error ?? 'Update failed')
    } else {
      await fetchBookings()
    }
    setUpdatingId(null)
    setConfirmCancelId(null)
  }

  const mentOptions = [
    { key: 'all', label: 'All Mentors' },
    ...mentors.map(m => ({ key: m.id, label: m.full_name })),
  ]
  const statOptions = [
    { key: 'all',             label: 'All Statuses' },
    { key: 'pending_payment', label: 'Pending' },
    { key: 'confirmed',       label: 'Confirmed' },
    { key: 'cancelled',       label: 'Cancelled' },
  ]

  const today = new Date().toISOString().slice(0, 10)

  const { upcoming, past } = useMemo(() => {
    const all = bookings.filter(b => {
      if (mentFilter !== 'all' && b.mentor_id !== mentFilter) return false
      if (statFilter !== 'all' && b.status !== statFilter) return false
      return true
    })
    return {
      upcoming: all.filter(b => b.slot_date >= today).sort((a, b) => a.slot_date.localeCompare(b.slot_date) || (a.slot_time ?? '').localeCompare(b.slot_time ?? '')),
      past:     all.filter(b => b.slot_date < today).sort((a, b) => b.slot_date.localeCompare(a.slot_date) || (b.slot_time ?? '').localeCompare(a.slot_time ?? '')),
    }
  }, [bookings, mentFilter, statFilter, today])

  function BookingRow({ b, muted }: { b: Booking; muted?: boolean }) {
    const who = b.mentor_name ?? (b.service_name ? `${b.service_name} (legacy)` : '—')
    return (
      <div className={muted ? 'opacity-50' : ''}>
        <button type="button" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
          className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#fafaf9] transition-colors text-left">
          <div className="flex-shrink-0 w-24">
            <p className="text-sm font-medium text-gray-900 leading-tight">{formatDate(b.slot_date)}</p>
            <p className="text-xs text-gray-400">{b.slot_time?.slice(0, 5)}</p>
          </div>
          {!fixedMentorId && (
            <div className="hidden sm:block flex-shrink-0 w-32">
              <p className="text-xs text-forest truncate">{who}</p>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{b.name}</p>
            <p className="text-xs text-gray-400 truncate">{b.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {b.is_member_free && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px bg-forest/10 text-forest">
                Member
              </span>
            )}
            {b.cv_url && (
              <a href={`/api/career/bookings/${b.id}/cv`} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                CV
              </a>
            )}
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${statusBadgeCls(b.status)}`}>
              {statusLabel(b.status)}
            </span>
            <ChevronIcon open={expandedId === b.id} />
          </div>
        </button>

        {expandedId === b.id && (
          <div className="border-t border-forest/20 bg-[#f9f9f8] px-5 py-5">
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-5">
              <div>
                <p className={labelCls}>Mentor</p>
                <p className="text-sm text-gray-700">{who}</p>
              </div>
              <div>
                <p className={labelCls}>Email</p>
                <a href={`mailto:${b.email}`} className="text-sm text-forest hover:underline underline-offset-2">{b.email}</a>
              </div>
              <div className="sm:col-span-2">
                <p className={labelCls}>Motivation</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{b.motivation}</p>
              </div>
              <div className="sm:col-span-2">
                <p className={labelCls}>Goal</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{b.goal}</p>
              </div>
              {b.cv_url && (
                <div>
                  <p className={labelCls}>CV</p>
                  <a href={`/api/career/bookings/${b.id}/cv`} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-forest hover:underline underline-offset-2">
                    Download CV →
                  </a>
                </div>
              )}
              {staff && b.stripe_payment_intent_id && (
                <div>
                  <p className={labelCls}>Stripe PI</p>
                  <p className="text-xs text-gray-400 font-mono break-all">{b.stripe_payment_intent_id}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {staff ? (
                <>
                  <p className={`${labelCls} mb-0`}>Change Status</p>
                  <div className="relative">
                    <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                      disabled={updatingId === b.id}
                      className="border border-gray-200 px-3 py-1.5 text-xs appearance-none bg-white focus:outline-none focus:border-forest pr-7 disabled:opacity-50">
                      <option value="pending_payment">Pending Payment</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </>
              ) : b.status !== 'cancelled' && (
                confirmCancelId === b.id ? (
                  <>
                    <span className="text-xs text-gray-500">Cancel this booking? A paid session is not refunded automatically.</span>
                    <button onClick={() => updateStatus(b.id, 'cancelled')} disabled={updatingId === b.id}
                      className="text-xs font-semibold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 transition-colors disabled:opacity-40">
                      {updatingId === b.id ? '…' : 'Confirm'}
                    </button>
                    <button onClick={() => setConfirmCancelId(null)}
                      className="text-xs font-semibold uppercase tracking-widest border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-gray-400 transition-colors">
                      Back
                    </button>
                  </>
                ) : (
                  <button onClick={() => setConfirmCancelId(b.id)}
                    className="text-xs font-semibold uppercase tracking-widest border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 transition-colors">
                    Cancel booking
                  </button>
                )
              )}
              {updatingId === b.id && staff && <span className="text-xs text-gray-400">Saving…</span>}
              {statusError && expandedId === b.id && <span className="text-xs text-red-600">{statusError}</span>}
              {staff && (
                <div className="ml-auto flex items-center gap-2">
                  {confirmDelId === b.id ? (
                    <>
                      <span className="text-xs text-gray-500">Are you sure? This cannot be undone.</span>
                      <button onClick={() => deleteBooking(b.id)} disabled={deletingId === b.id}
                        className="text-xs font-semibold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 transition-colors disabled:opacity-40">
                        {deletingId === b.id ? '…' : 'Confirm'}
                      </button>
                      <button onClick={() => setConfirmDelId(null)}
                        className="text-xs font-semibold uppercase tracking-widest border border-gray-200 px-3 py-1.5 text-gray-600 hover:border-gray-400 transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelId(b.id)}
                      className="text-xs font-semibold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  const filters = [
    ...(fixedMentorId ? [] : [{ value: mentFilter, onChange: setMentFilter, options: mentOptions }]),
    { value: statFilter, onChange: setStatFilter, options: statOptions },
  ]

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-6">
        {filters.map(({ value, onChange, options }, idx) => (
          <div key={idx} className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
              className="border border-gray-200 px-3 py-2 text-sm appearance-none bg-white focus:outline-none focus:border-forest pr-8">
              {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ))}
        <span className="text-xs text-gray-400">{upcoming.length + past.length} booking{upcoming.length + past.length !== 1 ? 's' : ''}</span>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 border border-dashed border-gray-200 text-center">No upcoming bookings.</p>
      ) : (
        <div className="border border-gray-200">
          {upcoming.map((b, i) => (
            <div key={b.id} className={i > 0 ? 'border-t border-gray-200' : ''}>
              <BookingRow b={b} />
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-6">
          <button type="button" onClick={() => setPastOpen(o => !o)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">
            <svg className={`w-3.5 h-3.5 transition-transform ${pastOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Past Bookings ({past.length})
          </button>
          {pastOpen && (
            <div className="border border-gray-200 mt-3">
              {past.map((b, i) => (
                <div key={b.id} className={i > 0 ? 'border-t border-gray-200' : ''}>
                  <BookingRow b={b} muted />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
