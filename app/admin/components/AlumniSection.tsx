'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Alumni } from '@/lib/types'

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
      <h2 className="font-serif text-2xl font-bold text-[#1a4a3a]">{title}</h2>
      <div className="w-8 h-px bg-[#1a4a3a] mt-2" />
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alumni')
      .insert({
        name: name.trim(),
        role: role.trim(),
        graduation_year: graduationYear.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        current_company: currentCompany.trim() || null,
        industry: industry || null,
      })
      .select('id, name, role, graduation_year, linkedin_url, current_company, industry, order_index, created_at')
      .single()
    if (error) {
      setError(error.message)
    } else {
      onInserted(data as Alumni)
      setName('')
      setRole('')
      setGraduationYear('')
      setLinkedinUrl('')
      setCurrentCompany('')
      setIndustry('')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-black/10 p-6 space-y-4">
      <p className="text-xs font-medium tracking-wide text-[#6b7280] uppercase mb-2">Add Alumni</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full name *"
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
        <input
          required
          value={role}
          onChange={e => setRole(e.target.value)}
          placeholder="Role / position *"
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
        <input
          value={graduationYear}
          onChange={e => setGraduationYear(e.target.value)}
          placeholder="Graduation year (e.g. 2023)"
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
        <input
          value={currentCompany}
          onChange={e => setCurrentCompany(e.target.value)}
          placeholder="Current company"
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
        <select
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          className="w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#1a4a3a] focus:border-[#1a4a3a] text-sm text-gray-900 bg-white rounded-none cursor-pointer appearance-none transition-colors"
          style={{ accentColor: '#1a4a3a' }}
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
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors sm:col-span-2"
        />
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!(name ?? '').trim() || !(role ?? '').trim()) return
    setSaving(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('alumni')
        .update({
          name: String(name ?? '').trim(),
          role: String(role ?? '').trim(),
          graduation_year: String(graduationYear ?? '').trim() || null,
          linkedin_url: String(linkedinUrl ?? '').trim() || null,
          current_company: String(currentCompany ?? '').trim() || null,
          industry: String(industry ?? '').trim() || null,
        })
        .eq('id', alumni.id)
        .select('id, name, role, graduation_year, linkedin_url, current_company, industry, order_index, created_at')
        .single()
      if (error) {
        console.error('[AlumniRow] update error:', error)
        setError(error.message)
      } else {
        onUpdated(data as Alumni)
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
    const supabase = createClient()
    await supabase.from('alumni').delete().eq('id', alumni.id)
    onDeleted(alumni.id)
  }

  return (
    <div className="bg-white border-b border-black/5 last:border-b-0">
      <div className="px-6 py-4 flex items-center gap-4">
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[#d1d5db] hover:text-[#9ca3af] touch-none"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0a0a0a] truncate">{alumni.name}</p>
          <p className="text-xs text-[#6b7280] truncate">
            {alumni.role}{alumni.current_company ? ` · ${alumni.current_company}` : ''}{alumni.graduation_year ? ` · ${alumni.graduation_year}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setOpen(o => !o)}
            className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors duration-150"
          >
            {open ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors duration-150 disabled:opacity-40"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="px-6 pb-5 pt-2 border-t border-black/5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Full name *" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors" />
            <input required value={role} onChange={e => setRole(e.target.value)} placeholder="Role *" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors" />
            <input value={graduationYear} onChange={e => setGraduationYear(e.target.value)} placeholder="Graduation year" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors" />
            <input value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} placeholder="Current company" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors" />
            <select
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:ring-2 focus:ring-[#1a4a3a] focus:border-[#1a4a3a] text-sm text-gray-900 bg-white rounded-none cursor-pointer appearance-none transition-colors sm:col-span-2"
              style={{ accentColor: '#1a4a3a' }}
            >
              <option value="" disabled className="text-gray-400">Select industry</option>
              {INDUSTRY_OPTIONS.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="LinkedIn URL" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors sm:col-span-2" />
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <button type="submit" disabled={saving} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-150 disabled:opacity-50">
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
        className="flex items-center gap-3 w-full text-left group border border-black/10 bg-white px-4 py-3 hover:border-[#1a4a3a] transition-colors duration-150"
      >
        <span className="text-sm font-medium text-[#0a0a0a] group-hover:text-[#1a4a3a] transition-colors flex-1">
          Alumni ({list.length})
        </span>
        <svg
          className="w-4 h-4 text-[#9ca3af] transition-transform duration-200 flex-shrink-0"
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
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, role or company…"
              className="w-full pl-9 pr-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
            />
          </div>

          <div className="bg-black/5 rounded-sm">
            {filtered.length === 0 ? (
              <div className="bg-white px-6 py-8 text-center text-sm text-[#6b7280]">
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
