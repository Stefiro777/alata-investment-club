'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../../DashboardProfileContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type CareerService = {
  id: string
  name: string
  description: string | null
  duration_minutes: number | null
  price_cents: number
  max_bookings_per_slot: number
  active: boolean
}

type CareerAvailability = {
  id: string
  service_id: string
  slot_type: 'recurring' | 'one_time'
  day_of_week: number | null
  date: string | null
  slot_time: string
  end_time: string | null
  active: boolean
}

type CareerBooking = {
  id: string
  service_id: string
  service_name?: string
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

type CareerNotificationContact = {
  id: string
  service_id: string
  name: string
  email: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'services' as const,      label: 'Services' },
  { key: 'availability' as const,  label: 'Availability' },
  { key: 'bookings' as const,      label: 'Bookings' },
  { key: 'notifications' as const, label: 'Notifications' },
]
type Tab = typeof TABS[number]['key']

// Mon–Sun order for display; values are JS getDay() (0=Sun)
const DOW_BUTTONS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
]
const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function statusBadgeCls(status: string): string {
  if (status === 'confirmed')      return 'bg-[#1a4a3a] text-white'
  if (status === 'cancelled')      return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-800'
}

function statusLabel(status: string): string {
  if (status === 'confirmed') return 'CONFIRMED'
  if (status === 'cancelled') return 'CANCELLED'
  return 'PENDING'
}

// ── Shared style constants ────────────────────────────────────────────────────

const inputCls  = 'w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1a4a3a] bg-white'
const labelCls  = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1'
const btnPrimary = 'bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest px-5 py-2 transition-colors disabled:opacity-40'
const btnGhost  = 'border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:border-gray-400 transition-colors'

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}

// ── ConfirmDelete inline helper ───────────────────────────────────────────────

function ConfirmDelete({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Delete?</span>
      <button onClick={onConfirm} disabled={busy}
        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">
        {busy ? '…' : 'Yes'}
      </button>
      <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-700">No</button>
    </div>
  )
}

// ── SERVICES TAB ──────────────────────────────────────────────────────────────

type ServiceForm = {
  name: string
  description: string
  duration_minutes: string
  price_euros: string
  max_bookings_per_slot: string
  active: boolean
}

const EMPTY_SVC_FORM: ServiceForm = {
  name: '', description: '', duration_minutes: '60',
  price_euros: '0', max_bookings_per_slot: '1', active: true,
}

function svcToForm(s: CareerService): ServiceForm {
  return {
    name: s.name,
    description: s.description ?? '',
    duration_minutes: String(s.duration_minutes ?? 60),
    price_euros: ((s.price_cents ?? 0) / 100).toFixed(2),
    max_bookings_per_slot: String(s.max_bookings_per_slot ?? 1),
    active: s.active,
  }
}

function formToSvcPayload(f: ServiceForm) {
  return {
    name: f.name.trim(),
    description: f.description.trim() || null,
    duration_minutes: parseInt(f.duration_minutes, 10) || null,
    price_cents: Math.round(parseFloat(f.price_euros || '0') * 100),
    max_bookings_per_slot: parseInt(f.max_bookings_per_slot, 10) || 1,
    active: f.active,
  }
}

function SvcFormFields({ form, onChange }: { form: ServiceForm | undefined; onChange: (f: ServiceForm) => void }) {
  if (!form) return null
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className={labelCls}>Name *</label>
        <input value={form.name} onChange={e => onChange({ ...form, name: e.target.value })}
          placeholder="e.g. CV Review" className={inputCls} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Description</label>
        <textarea rows={2} value={form.description} onChange={e => onChange({ ...form, description: e.target.value })}
          placeholder="Short description…" className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label className={labelCls}>Duration (min)</label>
        <input type="number" min={0} value={form.duration_minutes}
          onChange={e => onChange({ ...form, duration_minutes: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Price (€)</label>
        <input type="number" min={0} step="0.01" value={form.price_euros}
          onChange={e => onChange({ ...form, price_euros: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Max per slot</label>
        <input type="number" min={1} value={form.max_bookings_per_slot}
          onChange={e => onChange({ ...form, max_bookings_per_slot: e.target.value })} className={inputCls} />
      </div>
      <div className="flex items-center gap-2 pt-5">
        <input type="checkbox" id="svc-active" checked={form.active}
          onChange={e => onChange({ ...form, active: e.target.checked })}
          className="accent-[#1a4a3a] w-3.5 h-3.5" />
        <label htmlFor="svc-active" className="text-sm text-gray-700">Active</label>
      </div>
    </div>
  )
}

function ServicesTab({
  services,
  setServices,
}: {
  services: CareerService[]
  setServices: React.Dispatch<React.SetStateAction<CareerService[]>>
}) {
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForms, setEditForms]   = useState<Record<string, ServiceForm>>({})
  const [addForm, setAddForm]       = useState<ServiceForm | null>(null)
  const [saving, setSaving]         = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  function startEdit(s: CareerService) {
    setEditingId(s.id)
    setEditForms(prev => ({ ...prev, [s.id]: svcToForm(s) }))
    setError(null)
  }

  async function saveEdit(s: CareerService) {
    const form = editForms[s.id]
    if (!form?.name.trim()) return
    setSaving(s.id); setError(null)
    try {
      const { data, error: err } = await createClient()
        .from('career_services').update(formToSvcPayload(form)).eq('id', s.id).select()
      if (err) { setError(err.message); setSaving(null); return }
      const row = (data as CareerService[])?.[0]
      if (row) setServices(prev => prev.map(x => x.id === s.id ? row : x))
      setEditingId(null); setSaving(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred')
      setSaving(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await createClient().from('career_services').delete().eq('id', id)
    setServices(prev => prev.filter(x => x.id !== id))
    setConfirmDel(null); setDeleting(false)
  }

  async function saveNew() {
    if (!addForm?.name.trim()) return
    setSaving('new'); setError(null)
    const { data, error: err } = await createClient()
      .from('career_services').insert(formToSvcPayload(addForm)).select()
    if (err) { setError(err.message); setSaving(null); return }
    setServices(prev => [...prev, (data as CareerService[])[0]])
    setAddForm(null); setSaving(null)
  }

  async function toggleActive(s: CareerService) {
    const { data } = await createClient()
      .from('career_services').update({ active: !s.active }).eq('id', s.id).select()
    if (data) setServices(prev => prev.map(x => x.id === s.id ? ((data as CareerService[])[0]) : x))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {services.length} service{services.length !== 1 ? 's' : ''}
        </p>
        {!addForm && (
          <button onClick={() => { setAddForm(EMPTY_SVC_FORM); setError(null) }} className={btnPrimary}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Service
            </span>
          </button>
        )}
      </div>

      {services.length === 0 && !addForm && (
        <p className="text-sm text-gray-400 py-8 border border-dashed border-gray-200 text-center mb-4">
          No services yet. Add your first service above.
        </p>
      )}

      {services.length > 0 && (
        <div className="border border-gray-200 mb-4">
          {services.map((s, i) => (
            <div key={s.id} className={i > 0 ? 'border-t border-gray-200' : ''}>
              {/* Row */}
              <div className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#fafaf9] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${s.active ? 'bg-[#1a4a3a] text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {s.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-700 font-medium">{formatPrice(s.price_cents)}</span>
                    {s.duration_minutes && (
                      <span className="text-xs text-gray-400">{s.duration_minutes} min</span>
                    )}
                    <span className="text-xs text-gray-400">Max {s.max_bookings_per_slot}/slot</span>
                  </div>
                  {s.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(s)} title={s.active ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-gray-400 hover:text-[#1a4a3a] transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {s.active
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                  {editingId !== s.id && (
                    <button onClick={() => startEdit(s)} title="Edit"
                      className="p-1.5 text-gray-400 hover:text-[#1a4a3a] transition-colors">
                      <PencilIcon />
                    </button>
                  )}
                  {confirmDel === s.id ? (
                    <ConfirmDelete
                      onConfirm={() => handleDelete(s.id)}
                      onCancel={() => setConfirmDel(null)}
                      busy={deleting}
                    />
                  ) : (
                    <button onClick={() => setConfirmDel(s.id)} title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === s.id && editForms[s.id] && (
                <div className="border-t border-[#1a4a3a]/20 bg-[#f9f9f8] px-5 py-5">
                  <SvcFormFields form={editForms[s.id]} onChange={f => setEditForms(prev => ({ ...prev, [s.id]: f }))} />
                  {error && <p className="mt-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={() => saveEdit(s)} disabled={saving === s.id || !editForms[s.id]?.name.trim()} className={btnPrimary}>
                      {saving === s.id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingId(null); setError(null) }} className={btnGhost}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {addForm && (
        <div className="border border-[#1a4a3a]/30 bg-[#f9f9f8] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] mb-4">New Service</p>
          <SvcFormFields form={addForm} onChange={setAddForm} />
          {error && <p className="mt-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={saveNew} disabled={saving === 'new' || !addForm.name.trim()} className={btnPrimary}>
              {saving === 'new' ? 'Saving…' : 'Add Service'}
            </button>
            <button onClick={() => { setAddForm(null); setError(null) }} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AVAILABILITY TAB ──────────────────────────────────────────────────────────

type AvailForm = {
  slot_type: 'recurring' | 'one_time'
  date: string
  day_of_week: number
  slot_time: string
  end_time: string
  active: boolean
}

const EMPTY_AVAIL: AvailForm = {
  slot_type: 'recurring', date: '', day_of_week: 1,
  slot_time: '', end_time: '', active: true,
}

function AvailabilityTab({ services }: { services: CareerService[] }) {
  const [svcId, setSvcId]           = useState(services[0]?.id ?? '')
  const [rows, setRows]             = useState<CareerAvailability[]>([])
  const [loading, setLoading]       = useState(false)
  const [form, setForm]             = useState<AvailForm>(EMPTY_AVAIL)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    if (!svcId) return
    setLoading(true)
    createClient()
      .from('career_availability')
      .select('*')
      .eq('service_id', svcId)
      .order('slot_type')
      .order('day_of_week', { nullsFirst: false })
      .order('date', { nullsFirst: false })
      .then(({ data }) => { setRows((data ?? []) as CareerAvailability[]); setLoading(false) })
  }, [svcId])

  async function toggleActive(a: CareerAvailability) {
    const { data } = await createClient()
      .from('career_availability').update({ active: !a.active }).eq('id', a.id).select().single()
    if (data) setRows(prev => prev.map(x => x.id === a.id ? (data as CareerAvailability) : x))
  }

  async function deleteRow(id: string) {
    setDeleting(true)
    await createClient().from('career_availability').delete().eq('id', id)
    setRows(prev => prev.filter(x => x.id !== id))
    setConfirmDel(null); setDeleting(false)
  }

  async function saveSlot() {
    if (!svcId) return
    if (!form.slot_time) { setError('Start time is required'); return }
    if (form.slot_type === 'one_time' && !form.date) { setError('Date is required'); return }
    setSaving(true); setError(null)

    const payload: Record<string, unknown> = {
      service_id: svcId,
      slot_type: form.slot_type,
      slot_time: form.slot_time,
      end_time: form.end_time || null,
      active: form.active,
      day_of_week: form.slot_type === 'recurring' ? form.day_of_week : null,
      date: form.slot_type === 'one_time' ? form.date : null,
    }

    const { data, error: err } = await createClient()
      .from('career_availability').insert(payload).select().single()
    if (err) { setError(err.message); setSaving(false); return }
    setRows(prev => [...prev, data as CareerAvailability])
    setForm(EMPTY_AVAIL); setSaving(false)
  }

  return (
    <div>
      {/* Service selector */}
      <div className="mb-6 max-w-xs">
        <label className={labelCls}>Service</label>
        <div className="relative">
          <select value={svcId} onChange={e => setSvcId(e.target.value)}
            className={`${inputCls} appearance-none pr-8`}>
            {services.length === 0 && <option value="">No services</option>}
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Existing slots */}
      {loading ? (
        <p className="text-sm text-gray-400 mb-6">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-5 border border-dashed border-gray-200 text-center mb-6">
          No slots for this service yet.
        </p>
      ) : (
        <div className="border border-gray-200 mb-6">
          {rows.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-3 px-5 py-3 bg-white hover:bg-[#fafaf9] transition-colors ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${a.slot_type === 'one_time' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {a.slot_type === 'one_time' ? 'One-Time' : 'Recurring'}
                </span>
                <span className="text-sm text-gray-700 font-medium">
                  {a.slot_type === 'one_time'
                    ? (a.date ? formatDate(a.date) : '—')
                    : (a.day_of_week !== null ? DOW_NAMES[a.day_of_week] : '—')}
                </span>
                <span className="text-sm text-gray-500">
                  {a.slot_time?.slice(0, 5)}{a.end_time ? ` – ${a.end_time.slice(0, 5)}` : ''}
                </span>
                <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${a.active ? 'bg-[#1a4a3a] text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {a.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(a)} title={a.active ? 'Deactivate' : 'Activate'}
                  className="p-1.5 text-gray-400 hover:text-[#1a4a3a] transition-colors">
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
      <div className="border border-[#1a4a3a]/30 bg-[#f9f9f8] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] mb-4">Add Slot</p>

        {/* Type toggle */}
        <div className="mb-4">
          <label className={labelCls}>Type</label>
          <div className="flex border border-gray-200 max-w-xs">
            {(['recurring', 'one_time'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({ ...f, slot_type: t }))}
                className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors border-r border-gray-200 last:border-r-0 ${form.slot_type === t ? 'bg-[#1a4a3a] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t === 'recurring' ? 'Recurring' : 'One-Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Date or day-of-week */}
        {form.slot_type === 'one_time' ? (
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
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border transition-colors ${form.day_of_week === value ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]' : 'border-gray-200 text-gray-600 hover:border-[#1a4a3a]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Times */}
        <div className="grid grid-cols-2 gap-4 mb-4 max-w-sm">
          <div>
            <label className={labelCls}>Start time *</label>
            <input type="time" value={form.slot_time}
              onChange={e => setForm(f => ({ ...f, slot_time: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End time</label>
            <input type="time" value={form.end_time}
              onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input type="checkbox" id="avail-active" checked={form.active}
            onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
            className="accent-[#1a4a3a] w-3.5 h-3.5" />
          <label htmlFor="avail-active" className="text-sm text-gray-700">Active</label>
        </div>

        {error && <p className="mb-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
        <button onClick={saveSlot} disabled={saving || !svcId} className={btnPrimary}>
          {saving ? 'Saving…' : 'Save Slot'}
        </button>
      </div>
    </div>
  )
}

// ── BOOKINGS TAB ──────────────────────────────────────────────────────────────

function BookingsTab({ services }: { services: CareerService[] }) {
  const [bookings, setBookings]     = useState<CareerBooking[]>([])
  const [loading, setLoading]       = useState(true)
  const [svcFilter, setSvcFilter]   = useState('all')
  const [statFilter, setStatFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .from('career_bookings')
      .select('*, career_services(name)')
      .order('slot_date', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []).map((r: Record<string, unknown>) => ({
          ...(r as CareerBooking),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          service_name: ((r as any).career_services as { name: string } | null)?.name ?? '—',
        }))
        setBookings(rows)
        setLoading(false)
      })
  }, [])

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id)
    const { data } = await createClient()
      .from('career_bookings').update({ status }).eq('id', id).select().single()
    if (data) setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as CareerBooking['status'] } : b))
    setUpdatingId(null)
  }

  const svcOptions = [
    { key: 'all', label: 'All Services' },
    ...services.map(s => ({ key: s.id, label: s.name })),
  ]
  const statOptions = [
    { key: 'all',             label: 'All Statuses' },
    { key: 'pending_payment', label: 'Pending' },
    { key: 'confirmed',       label: 'Confirmed' },
    { key: 'cancelled',       label: 'Cancelled' },
  ]

  const filtered = useMemo(() => bookings.filter(b => {
    if (svcFilter !== 'all' && b.service_id !== svcFilter) return false
    if (statFilter !== 'all' && b.status !== statFilter) return false
    return true
  }), [bookings, svcFilter, statFilter])

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        {[{ value: svcFilter, onChange: setSvcFilter, options: svcOptions },
          { value: statFilter, onChange: setStatFilter, options: statOptions }].map(({ value, onChange, options }, idx) => (
          <div key={idx} className="relative">
            <select value={value} onChange={e => onChange(e.target.value)}
              className="border border-gray-200 px-3 py-2 text-sm appearance-none bg-white focus:outline-none focus:border-[#1a4a3a] pr-8">
              {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        ))}
        <span className="text-xs text-gray-400">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 border border-dashed border-gray-200 text-center">No bookings found.</p>
      ) : (
        <div className="border border-gray-200">
          {filtered.map((b, i) => (
            <div key={b.id} className={i > 0 ? 'border-t border-gray-200' : ''}>
              {/* Clickable row */}
              <button type="button" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#fafaf9] transition-colors text-left">
                <div className="flex-shrink-0 w-24">
                  <p className="text-sm font-medium text-gray-900 leading-tight">{formatDate(b.slot_date)}</p>
                  <p className="text-xs text-gray-400">{b.slot_time?.slice(0, 5)}</p>
                </div>
                <div className="hidden sm:block flex-shrink-0 w-28">
                  <p className="text-xs text-gray-500 truncate">{b.service_name}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                  <p className="text-xs text-gray-400 truncate">{b.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {b.is_member_free && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px bg-[#1a4a3a]/10 text-[#1a4a3a]">
                      Member
                    </span>
                  )}
                  {b.cv_url && (
                    <a href={b.cv_url} target="_blank" rel="noopener noreferrer"
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

              {/* Expanded details */}
              {expandedId === b.id && (
                <div className="border-t border-[#1a4a3a]/20 bg-[#f9f9f8] px-5 py-5">
                  <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4 mb-5">
                    <div>
                      <p className={labelCls}>Service</p>
                      <p className="text-sm text-gray-700">{b.service_name}</p>
                    </div>
                    <div>
                      <p className={labelCls}>Email</p>
                      <a href={`mailto:${b.email}`} className="text-sm text-[#1a4a3a] hover:underline underline-offset-2">{b.email}</a>
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
                        <a href={b.cv_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-[#1a4a3a] hover:underline underline-offset-2">
                          Download CV →
                        </a>
                      </div>
                    )}
                    {b.stripe_payment_intent_id && (
                      <div>
                        <p className={labelCls}>Stripe PI</p>
                        <p className="text-xs text-gray-400 font-mono break-all">{b.stripe_payment_intent_id}</p>
                      </div>
                    )}
                  </div>
                  {/* Status change */}
                  <div className="flex items-center gap-3">
                    <p className={`${labelCls} mb-0`}>Change Status</p>
                    <div className="relative">
                      <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                        disabled={updatingId === b.id}
                        className="border border-gray-200 px-3 py-1.5 text-xs appearance-none bg-white focus:outline-none focus:border-[#1a4a3a] pr-7 disabled:opacity-50">
                        <option value="pending_payment">Pending Payment</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {updatingId === b.id && <span className="text-xs text-gray-400">Saving…</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── NOTIFICATIONS TAB ─────────────────────────────────────────────────────────

function NotificationsTab({ services }: { services: CareerService[] }) {
  const [svcId, setSvcId]           = useState(services[0]?.id ?? '')
  const [contacts, setContacts]     = useState<CareerNotificationContact[]>([])
  const [loading, setLoading]       = useState(false)
  const [addName, setAddName]       = useState('')
  const [addEmail, setAddEmail]     = useState('')
  const [adding, setAdding]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  useEffect(() => {
    if (!svcId) return
    setLoading(true)
    createClient()
      .from('career_notification_contacts')
      .select('*')
      .eq('service_id', svcId)
      .order('created_at')
      .then(({ data }) => { setContacts((data ?? []) as CareerNotificationContact[]); setLoading(false) })
  }, [svcId])

  async function addContact() {
    if (!addName.trim() || !addEmail.trim() || !svcId) return
    setAdding(true); setError(null)
    const { data, error: err } = await createClient()
      .from('career_notification_contacts')
      .insert({ service_id: svcId, name: addName.trim(), email: addEmail.trim() })
      .select().single()
    if (err) { setError(err.message); setAdding(false); return }
    setContacts(prev => [...prev, data as CareerNotificationContact])
    setAddName(''); setAddEmail(''); setAdding(false)
  }

  async function deleteContact(id: string) {
    setDeleting(true)
    await createClient().from('career_notification_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
    setConfirmDel(null); setDeleting(false)
  }

  return (
    <div>
      {/* Service selector */}
      <div className="mb-6 max-w-xs">
        <label className={labelCls}>Service</label>
        <div className="relative">
          <select value={svcId} onChange={e => setSvcId(e.target.value)}
            className={`${inputCls} appearance-none pr-8`}>
            {services.length === 0 && <option value="">No services</option>}
            {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Contact list */}
      {loading ? (
        <p className="text-sm text-gray-400 mb-6">Loading…</p>
      ) : contacts.length === 0 ? (
        <p className="text-sm text-gray-400 py-5 border border-dashed border-gray-200 text-center mb-6">
          No notification contacts for this service.
        </p>
      ) : (
        <div className="border border-gray-200 mb-6">
          {contacts.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-4 px-5 py-3 bg-white ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                <p className="text-xs text-gray-400">{c.email}</p>
              </div>
              <div className="flex-shrink-0">
                {confirmDel === c.id ? (
                  <ConfirmDelete onConfirm={() => deleteContact(c.id)} onCancel={() => setConfirmDel(null)} busy={deleting} />
                ) : (
                  <button onClick={() => setConfirmDel(c.id)} title="Delete"
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add contact form */}
      <div className="border border-[#1a4a3a]/30 bg-[#f9f9f8] px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] mb-4">Add Contact</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4 max-w-lg">
          <div>
            <label className={labelCls}>Name *</label>
            <input value={addName} onChange={e => setAddName(e.target.value)}
              placeholder="Full name" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email *</label>
            <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
              placeholder="email@example.com" className={inputCls} />
          </div>
        </div>
        {error && <p className="mb-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
        <button onClick={addContact}
          disabled={adding || !addName.trim() || !addEmail.trim() || !svcId}
          className={btnPrimary}>
          {adding ? 'Adding…' : 'Add Contact'}
        </button>
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────

export default function CareerBookingsPage() {
  const profile = useProfile()
  const router  = useRouter()

  const [tab, setTab]                   = useState<Tab>('services')
  const [services, setServices]         = useState<CareerService[]>([])
  const [loadingServices, setLoading]   = useState(true)
  const [accessChecked, setAccessChecked] = useState(false)

  // Access control
  useEffect(() => {
    if (!profile) return
    const ok =
      profile.role === 'bod' ||
      profile.role === 'director' ||
      (profile.teams ?? []).includes('career')
    if (!ok) { router.push('/dashboard'); return }
    setAccessChecked(true)
  }, [profile, router])

  // Load services once access is confirmed
  useEffect(() => {
    if (!accessChecked) return
    createClient()
      .from('career_services')
      .select('*')
      .order('name')
      .then(({ data }) => { setServices((data ?? []) as CareerService[]); setLoading(false) })
  }, [accessChecked])

  if (!accessChecked) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-12">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">

      {/* Page header */}
      <div className="mb-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Career Bookings</h1>
        <div className="w-8 h-px bg-[#1a4a3a]" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 border-b border-gray-200 mb-8">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? 'border-[#1a4a3a] text-[#1a4a3a]'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loadingServices ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {tab === 'services'      && <ServicesTab services={services} setServices={setServices} />}
          {tab === 'availability'  && <AvailabilityTab services={services} />}
          {tab === 'bookings'      && <BookingsTab services={services} />}
          {tab === 'notifications' && <NotificationsTab services={services} />}
        </>
      )}
    </div>
  )
}
