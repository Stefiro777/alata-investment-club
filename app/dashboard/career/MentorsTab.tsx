'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type CareerMentor = {
  id: string
  slug: string
  full_name: string
  role_title: string | null
  photo_url: string | null
  bio_short: string | null
  bio_long: string | null
  notification_email: string
  active: boolean
  display_order: number
}

type MentorForm = {
  full_name: string
  role_title: string
  photo_url: string
  bio_short: string
  bio_long: string
  notification_email: string
  active: boolean
  display_order: string
}

const EMPTY_FORM: MentorForm = {
  full_name: '', role_title: '', photo_url: '',
  bio_short: '', bio_long: '', notification_email: '',
  active: true, display_order: '1',
}

function mentorToForm(m: CareerMentor): MentorForm {
  return {
    full_name: m.full_name,
    role_title: m.role_title ?? '',
    photo_url: m.photo_url ?? '',
    bio_short: m.bio_short ?? '',
    bio_long: m.bio_long ?? '',
    notification_email: m.notification_email,
    active: m.active,
    display_order: String(m.display_order ?? 1),
  }
}

function formToPayload(f: MentorForm) {
  return {
    full_name: f.full_name.trim(),
    role_title: f.role_title.trim() || null,
    photo_url: f.photo_url.trim() || null,
    bio_short: f.bio_short.trim() || null,
    bio_long: f.bio_long.trim() || null,
    notification_email: f.notification_email.trim(),
    active: f.active,
    display_order: parseInt(f.display_order, 10) || 1,
  }
}

// ── Shared style constants (mirrors ServicesTab) ────────────────────────────────

const inputCls   = 'w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white'
const labelCls   = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1'
const btnPrimary = 'bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest px-5 py-2 transition-colors disabled:opacity-40'
const btnGhost   = 'border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:border-gray-400 transition-colors'

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

function ConfirmDelete({ onConfirm, onCancel, busy }: { onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Delete?</span>
      <button onClick={onConfirm} disabled={busy} className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">
        {busy ? '…' : 'Yes'}
      </button>
      <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-700">No</button>
    </div>
  )
}

// ── Photo upload ──────────────────────────────────────────────────────────────

function PhotoInput({ currentUrl, onChange }: { currentUrl: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/career/mentors/upload-photo', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setUploadError(data.error ?? 'Upload failed') } else { onChange(data.url) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label className={labelCls}>Photo</label>
      <div className="flex gap-2 items-center">
        <input value={currentUrl} onChange={e => onChange(e.target.value)}
          className={`${inputCls} flex-1`} placeholder="https://… or upload below" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors disabled:opacity-50 whitespace-nowrap">
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="preview" className="mt-2 h-14 w-14 rounded-full object-cover object-top border border-gray-200" />
      )}
    </div>
  )
}

// ── Form fields ───────────────────────────────────────────────────────────────

function MentorFormFields({ form, onChange }: { form: MentorForm | undefined; onChange: (f: MentorForm) => void }) {
  if (!form) return null
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className={labelCls}>Full Name *</label>
        <input value={form.full_name} onChange={e => onChange({ ...form, full_name: e.target.value })}
          placeholder="e.g. Marco Rossi" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Role</label>
        <input value={form.role_title} onChange={e => onChange({ ...form, role_title: e.target.value })}
          placeholder="e.g. Head of M&A" className={inputCls} />
      </div>
      <div className="col-span-2">
        <PhotoInput currentUrl={form.photo_url} onChange={url => onChange({ ...form, photo_url: url })} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Bio (short — shown on the card)</label>
        <textarea rows={2} value={form.bio_short} onChange={e => onChange({ ...form, bio_short: e.target.value })}
          placeholder="One or two sentences…" className={`${inputCls} resize-none`} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Bio (long — shown when the card expands)</label>
        <textarea rows={4} value={form.bio_long} onChange={e => onChange({ ...form, bio_long: e.target.value })}
          placeholder="Full bio…" className={`${inputCls} resize-none`} />
      </div>
      <div className="col-span-2">
        <label className={labelCls}>Notification Email *</label>
        <input type="email" value={form.notification_email} onChange={e => onChange({ ...form, notification_email: e.target.value })}
          placeholder="mentor@example.com" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Display order</label>
        <input type="number" min={1} value={form.display_order}
          onChange={e => onChange({ ...form, display_order: e.target.value })} className={inputCls} />
      </div>
      <div className="flex items-center gap-2 pt-5">
        <input type="checkbox" id="mentor-active" checked={form.active}
          onChange={e => onChange({ ...form, active: e.target.checked })}
          className="accent-forest w-3.5 h-3.5" />
        <label htmlFor="mentor-active" className="text-sm text-gray-700">Active</label>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function MentorsTab() {
  const [mentors, setMentors]       = useState<CareerMentor[]>([])
  const [loading, setLoading]       = useState(true)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForms, setEditForms]   = useState<Record<string, MentorForm>>({})
  const [addForm, setAddForm]       = useState<MentorForm | null>(null)
  const [saving, setSaving]         = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  async function refresh() {
    const res = await fetch('/api/career/mentors')
    const json = await res.json()
    setMentors((json.data ?? []) as CareerMentor[])
    setLoading(false)
  }

  useEffect(() => { refresh() }, [])

  function startEdit(m: CareerMentor) {
    setEditingId(m.id)
    setEditForms(prev => ({ ...prev, [m.id]: mentorToForm(m) }))
    setError(null)
  }

  async function saveEdit(m: CareerMentor) {
    const form = editForms[m.id]
    if (!form?.full_name.trim() || !form?.notification_email.trim()) return
    setSaving(m.id); setError(null)
    const res = await fetch('/api/career/mentors', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, ...formToPayload(form) }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Update failed'); setSaving(null); return }
    await refresh()
    setEditingId(null); setSaving(null)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    await fetch('/api/career/mentors', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setMentors(prev => prev.filter(x => x.id !== id))
    setConfirmDel(null); setDeleting(false)
  }

  async function saveNew() {
    if (!addForm?.full_name.trim() || !addForm?.notification_email.trim()) return
    setSaving('new'); setError(null)
    const res = await fetch('/api/career/mentors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formToPayload(addForm)) })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Insert failed'); setSaving(null); return }
    await refresh()
    setAddForm(null); setSaving(null)
  }

  async function toggleActive(m: CareerMentor) {
    const res = await fetch('/api/career/mentors', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, active: !m.active }) })
    if (res.ok) await refresh()
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          {mentors.length} mentor{mentors.length !== 1 ? 's' : ''}
        </p>
        {!addForm && (
          <button onClick={() => { setAddForm(EMPTY_FORM); setError(null) }} className={btnPrimary}>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Mentor
            </span>
          </button>
        )}
      </div>

      {mentors.length === 0 && !addForm && (
        <p className="text-sm text-gray-400 py-8 border border-dashed border-gray-200 text-center mb-4">
          No mentors yet. Add your first mentor above.
        </p>
      )}

      {mentors.length > 0 && (
        <div className="border border-gray-200 mb-4">
          {mentors.map((m, i) => (
            <div key={m.id} className={i > 0 ? 'border-t border-gray-200' : ''}>
              <div className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-[#fafaf9] transition-colors">
                {m.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.photo_url} alt={m.full_name} className="w-9 h-9 rounded-full object-cover object-top flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{m.full_name}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px ${m.active ? 'bg-forest text-white' : 'bg-gray-200 text-gray-500'}`}>
                      {m.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {m.role_title && <span className="text-xs text-gray-700 font-medium">{m.role_title}</span>}
                    <span className="text-xs text-gray-400">#{m.display_order}</span>
                    <span className="text-xs text-gray-400">{m.notification_email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(m)} title={m.active ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-gray-400 hover:text-forest transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {m.active
                        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                      }
                    </svg>
                  </button>
                  {editingId !== m.id && (
                    <button onClick={() => startEdit(m)} title="Edit" className="p-1.5 text-gray-400 hover:text-forest transition-colors">
                      <PencilIcon />
                    </button>
                  )}
                  {confirmDel === m.id ? (
                    <ConfirmDelete onConfirm={() => handleDelete(m.id)} onCancel={() => setConfirmDel(null)} busy={deleting} />
                  ) : (
                    <button onClick={() => setConfirmDel(m.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </div>

              {editingId === m.id && editForms[m.id] && (
                <div className="border-t border-forest/20 bg-[#f9f9f8] px-5 py-5">
                  <MentorFormFields form={editForms[m.id]} onChange={f => setEditForms(prev => ({ ...prev, [m.id]: f }))} />
                  {error && <p className="mt-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
                  <div className="flex items-center gap-3 mt-4">
                    <button onClick={() => saveEdit(m)} disabled={saving === m.id || !editForms[m.id]?.full_name.trim()} className={btnPrimary}>
                      {saving === m.id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingId(null); setError(null) }} className={btnGhost}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {addForm && (
        <div className="border border-forest/30 bg-[#f9f9f8] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-forest mb-4">New Mentor</p>
          <MentorFormFields form={addForm} onChange={setAddForm} />
          {error && <p className="mt-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
          <div className="flex items-center gap-3 mt-4">
            <button onClick={saveNew} disabled={saving === 'new' || !addForm.full_name.trim()} className={btnPrimary}>
              {saving === 'new' ? 'Saving…' : 'Add Mentor'}
            </button>
            <button onClick={() => { setAddForm(null); setError(null) }} className={btnGhost}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
