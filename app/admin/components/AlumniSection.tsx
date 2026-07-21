'use client'

import { useState, useRef } from 'react'
import type { Alumni } from '@/lib/types'

// ── Photo upload helper ────────────────────────────────────────────────────────
// Uploaded via the /api/alumni/photo route (service role) rather than directly
// from the browser client — the alumni-photos bucket has no anon/authenticated
// storage policy, same reason the alumni table writes below go through API routes.

async function uploadAlumniPhoto(file: File): Promise<{ url: string } | { error: string }> {
  const formData = new FormData()
  formData.set('file', file)
  const res = await fetch('/api/alumni/photo', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) return { error: data.error || 'Upload failed' }
  return { url: data.url }
}

function PhotoInput({
  currentUrl,
  onChange,
}: {
  currentUrl: string
  onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadAlumniPhoto(file)
    if ('error' in result) {
      setUploadError(result.error)
    } else {
      onChange(result.url)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="sm:col-span-2">
      <label className="block text-xs text-ink-500 mb-1">Photo</label>
      <div className="flex gap-2 items-center">
        <input
          value={currentUrl}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
          placeholder="https://… or upload below"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-fast disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="preview" className="mt-2 h-14 w-14 rounded-full object-cover object-top border border-line" />
      )}
    </div>
  )
}

const INDUSTRY_OPTIONS = [
  'Investment Banking', 'Consulting', 'Asset Management', 'Private Equity',
  'Venture Capital', 'Hedge Fund', 'Big Tech', 'Sales & Business Development', 'Start-up', 'Audit & Accounting',
  'Tax & Legal', 'Commercial Banking', 'Private Banking', 'Wealth Management',
  'Real Estate', 'Corporate Finance', 'Research & Valuation', 'Insurance',
  'Public Sector', 'Other',
]

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

// ── Alumni Insert Form ─────────────────────────────────────────────────────────

function AlumniInsertForm({ onInserted }: { onInserted: (a: Alumni) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [currentCompany, setCurrentCompany] = useState('')
  const [industry, setIndustry] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/alumni', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          graduation_year: graduationYear.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          current_company: currentCompany.trim() || null,
          industry: industry || null,
          photo_url: photoUrl.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error adding alumni')
      } else {
        onInserted(data.alumni as Alumni)
        setName('')
        setRole('')
        setGraduationYear('')
        setLinkedinUrl('')
        setCurrentCompany('')
        setIndustry('')
        setPhotoUrl('')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-line-faint p-6 space-y-4">
      <p className="text-xs font-medium tracking-wide text-ink-500 uppercase mb-2">Add Alumni</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full name *"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
        />
        <input
          required
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="Role / position *"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
        />
        <input
          value={graduationYear}
          onChange={e => setGraduationYear(e.target.value)}
          placeholder="Graduation year (e.g. 2023)"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
        />
        <input
          value={currentCompany}
          onChange={e => setCurrentCompany(e.target.value)}
          placeholder="Current company"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
        />
        <select
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          className="w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest text-sm text-gray-900 bg-white rounded-none cursor-pointer appearance-none transition-colors"
          style={{ accentColor: 'var(--forest)' }}
        >
          <option value="" disabled className="text-gray-400">Select industry</option>
          {INDUSTRY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <input
          value={linkedinUrl}
          onChange={e => setLinkedinUrl(e.target.value)}
          placeholder="LinkedIn URL"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors sm:col-span-2"
        />
        <PhotoInput currentUrl={photoUrl} onChange={setPhotoUrl} />
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? '…' : 'Add Alumni'}
      </button>
    </form>
  )
}

// ── Alumni Row ─────────────────────────────────────────────────────────────────

function AlumniRow({
  alumni,
  onUpdated,
  onDeleted,
  dragHandleProps,
}: {
  alumni: Alumni
  onUpdated: (a: Alumni) => void
  onDeleted: (id: string) => void
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(alumni.name ?? '')
  const [role, setRole] = useState(alumni.role ?? '')
  const [graduationYear, setGraduationYear] = useState(String(alumni.graduation_year ?? ''))
  const [linkedinUrl, setLinkedinUrl] = useState(alumni.linkedin_url ?? '')
  const [currentCompany, setCurrentCompany] = useState(alumni.current_company ?? '')
  const [industry, setIndustry] = useState<string>(
    Array.isArray(alumni.industry)
      ? String(alumni.industry[0] ?? '')
      : typeof alumni.industry === 'string'
        ? alumni.industry
        : ''
  )
  const [photoUrl, setPhotoUrl] = useState(alumni.photo_url ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!(name ?? '').trim() || !(role ?? '').trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/alumni/${alumni.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(name ?? '').trim(),
          role: String(role ?? '').trim(),
          graduation_year: String(graduationYear ?? '').trim() || null,
          linkedin_url: String(linkedinUrl ?? '').trim() || null,
          current_company: String(currentCompany ?? '').trim() || null,
          industry: String(industry ?? '').trim() || null,
          photo_url: String(photoUrl ?? '').trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('[AlumniRow] update error:', data.error)
        setError(data.error || 'Error updating alumni')
      } else {
        onUpdated(data.alumni as Alumni)
        setOpen(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[AlumniRow] unexpected error:', msg)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Remove ${alumni.name}?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/alumni/${alumni.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        console.error('[AlumniRow] delete error:', data.error)
        setDeleting(false)
        return
      }
      onDeleted(alumni.id)
    } catch (err) {
      console.error('[AlumniRow] unexpected delete error:', err)
      setDeleting(false)
    }
  }

  return (
    <div className="bg-white border-b border-black/5 last:border-b-0">
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-ink-300 hover:text-ink-400 touch-none"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          </svg>
        </div>

        {alumni.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={alumni.photo_url} alt={alumni.name} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{alumni.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{alumni.name}</p>
          <p className="text-xs text-ink-500 truncate">
            {alumni.role}{alumni.current_company ? ` · ${alumni.current_company}` : ''}{alumni.graduation_year ? ` · ${alumni.graduation_year}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setOpen(o => !o)}
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-3.5 transition-colors duration-fast"
          >
            {open ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-3.5 transition-colors duration-fast disabled:opacity-40"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="px-6 pb-5 pt-2 border-t border-black/5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name *" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors" />
            <input required value={role} onChange={e => setRole(e.target.value)} placeholder="Role *" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors" />
            <input value={graduationYear} onChange={e => setGraduationYear(e.target.value)} placeholder="Graduation year" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors" />
            <input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="Current company" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors" />
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-forest focus:border-forest text-sm text-gray-900 bg-white rounded-none cursor-pointer appearance-none transition-colors sm:col-span-2"
              style={{ accentColor: 'var(--forest)' }}
            >
              <option value="" disabled className="text-gray-400">Select industry</option>
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors sm:col-span-2" />
            <PhotoInput currentUrl={photoUrl} onChange={setPhotoUrl} />
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <button type="submit" disabled={saving} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-fast disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Alumni list with drag-and-drop ─────────────────────────────────────────────

function AlumniList({ alumni: initialAlumni }: { alumni: Alumni[] }) {
  const [list, setList] = useState<Alumni[]>(initialAlumni)
  const listRef = useRef<Alumni[]>(initialAlumni)
  listRef.current = list

  const dragIndex = useRef<number | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [search, setSearch] = useState('')

  function onDragStart(index: number) {
    dragIndex.current = index
  }

  async function onDrop(index: number) {
    const from = dragIndex.current
    if (from === null || from === index) { dragIndex.current = null; return }
    const next = [...listRef.current]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    setList(next)
    listRef.current = next
    dragIndex.current = null

    try {
      const res = await fetch('/api/alumni/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next.map((a, i) => ({ id: a.id, order_index: i })) }),
      })
      const data = await res.json()
      if (!res.ok) console.error('Reorder failed:', data)
    } catch (err) {
      console.error('[AlumniList] reorder network error:', err)
    }
  }

  function handleInserted(a: Alumni) {
    setList(prev => [...prev, a])
  }

  function handleUpdated(a: Alumni) {
    setList(prev => prev.map(x => x.id === a.id ? a : x))
  }

  function handleDeleted(id: string) {
    setList(prev => prev.filter(x => x.id !== id))
  }

  const filtered = search.trim()
    ? list.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.role.toLowerCase().includes(search.toLowerCase()) ||
        (a.current_company ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : list

  return (
    <div className="space-y-4">
      <AlumniInsertForm onInserted={handleInserted} />

      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setListOpen(v => !v)}
        className="flex items-center gap-3 w-full text-left group border border-line-faint bg-white px-4 py-3 hover:border-forest transition-colors duration-fast"
      >
        <span className="text-sm font-medium text-ink-900 group-hover:text-forest transition-colors flex-1">
          Alumni ({list.length})
        </span>
        <svg
          className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0"
          style={{ transform: listOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible body */}
      <div style={{ display: 'grid', gridTemplateRows: listOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {/* Search */}
          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role or company…"
              className="w-full pl-9 pr-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>

          <div className="bg-black/5 rounded-sm">
            {filtered.length === 0 ? (
              <div className="bg-white px-6 py-8 text-center text-sm text-ink-500">
                {search.trim() ? 'No results.' : 'No alumni yet.'}
              </div>
            ) : (
              filtered.map((a, i) => (
                <div
                  key={a.id}
                  draggable={!search.trim()}
                  onDragStart={!search.trim() ? () => onDragStart(i) : undefined}
                  onDragOver={e => e.preventDefault()}
                  onDrop={!search.trim() ? () => onDrop(i) : undefined}
                >
                  <AlumniRow
                    alumni={a}
                    onUpdated={handleUpdated}
                    onDeleted={handleDeleted}
                  />
                </div>
              ))
            )}
          </div>
          <div className="pb-1" />
        </div>
      </div>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export default function AlumniSection({ initialAlumni }: { initialAlumni: Alumni[] }) {
  return (
    <section id="alumni">
      <SectionHeading title="Alumni" />
      <AlumniList alumni={initialAlumni} />
    </section>
  )
}
