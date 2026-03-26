'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Alumni, AlumniCompany } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">{title}</h2>
      <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
    </div>
  )
}

// ── Photo / logo upload helpers ────────────────────────────────────────────────

async function uploadAlumniLogo(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage.from('alumni-logos').upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('alumni-logos').getPublicUrl(data.path)
  return { url: publicUrl }
}

// ── Alumni Insert Form ─────────────────────────────────────────────────────────

function AlumniInsertForm({ onInserted }: { onInserted: (a: Alumni) => void }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [currentCompany, setCurrentCompany] = useState('')
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
      })
      .select('id, name, role, graduation_year, linkedin_url, current_company, order_index, created_at')
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
  const [name, setName] = useState(alumni.name)
  const [role, setRole] = useState(alumni.role)
  const [graduationYear, setGraduationYear] = useState(alumni.graduation_year ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(alumni.linkedin_url ?? '')
  const [currentCompany, setCurrentCompany] = useState(alumni.current_company ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alumni')
      .update({
        name: name.trim(),
        role: role.trim(),
        graduation_year: graduationYear.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        current_company: currentCompany.trim() || null,
      })
      .eq('id', alumni.id)
      .select('id, name, role, graduation_year, linkedin_url, current_company, order_index, created_at')
      .single()
    if (error) {
      setError(error.message)
    } else {
      onUpdated(data as Alumni)
      setOpen(false)
    }
    setSaving(false)
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

function AlumniList({
  alumni: initialAlumni,
}: {
  alumni: Alumni[]
}) {
  const [list, setList] = useState<Alumni[]>(initialAlumni)
  const listRef = useRef<Alumni[]>(initialAlumni)
  listRef.current = list

  const dragIndex = useRef<number | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [search, setSearch] = useState('')

  function onDragStart(index: number) {
    dragIndex.current = index
  }

  function onDrop(index: number) {
    const from = dragIndex.current
    if (from === null || from === index) { dragIndex.current = null; return }
    const next = [...listRef.current]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    setList(next)
    listRef.current = next
    dragIndex.current = null

    const supabase = createClient()
    next.forEach((a, i) => {
      supabase.from('alumni').update({ order_index: i }).eq('id', a.id)
    })
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

// ── Alumni Company Insert Form ─────────────────────────────────────────────────

function AlumniCompanyInsertForm({ onInserted }: { onInserted: (c: AlumniCompany) => void }) {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const result = await uploadAlumniLogo(file)
    if ('error' in result) {
      setError(result.error)
    } else {
      setLogoUrl(result.url)
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !logoUrl.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alumni_companies')
      .insert({
        name: name.trim(),
        logo_url: logoUrl.trim(),
        website_url: websiteUrl.trim() || null,
      })
      .select('id, name, logo_url, website_url, created_at')
      .single()
    if (error) {
      setError(error.message)
    } else {
      onInserted(data as AlumniCompany)
      setName('')
      setLogoUrl('')
      setWebsiteUrl('')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-black/10 p-6 space-y-4">
      <p className="text-xs font-medium tracking-wide text-[#6b7280] uppercase mb-2">Add Company</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Company name *"
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
        <input
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="Website URL"
          className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
        />
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <p className="text-xs text-[#6b7280]">Logo *</p>
        <div className="flex gap-3 items-start">
          <input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="Logo URL or upload below"
            className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-50"
          >
            {uploading ? '…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
        {logoUrl && (
          <img src={logoUrl} alt="preview" className="h-10 object-contain border border-black/10 p-1 bg-white" />
        )}
      </div>

      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <button
        type="submit"
        disabled={saving || !logoUrl}
        className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? '…' : 'Add Company'}
      </button>
    </form>
  )
}

// ── Alumni Company Row ─────────────────────────────────────────────────────────

function AlumniCompanyRow({
  company,
  onUpdated,
  onDeleted,
}: {
  company: AlumniCompany
  onUpdated: (c: AlumniCompany) => void
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(company.name)
  const [logoUrl, setLogoUrl] = useState(company.logo_url)
  const [websiteUrl, setWebsiteUrl] = useState(company.website_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const result = await uploadAlumniLogo(file)
    if ('error' in result) {
      setError(result.error)
    } else {
      setLogoUrl(result.url)
    }
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !logoUrl.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alumni_companies')
      .update({
        name: name.trim(),
        logo_url: logoUrl.trim(),
        website_url: websiteUrl.trim() || null,
      })
      .eq('id', company.id)
      .select('id, name, logo_url, website_url, created_at')
      .single()
    if (error) {
      setError(error.message)
    } else {
      onUpdated(data as AlumniCompany)
      setOpen(false)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Remove ${company.name}?`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('alumni_companies').delete().eq('id', company.id)
    onDeleted(company.id)
  }

  return (
    <div className="bg-white border-b border-black/5 last:border-b-0">
      <div className="px-6 py-4 flex items-center gap-4">
        <img src={company.logo_url} alt={company.name} className="w-10 h-10 object-contain flex-shrink-0 border border-black/10 p-1" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0a0a0a] truncate">{company.name}</p>
          {company.website_url && (
            <p className="text-xs text-[#6b7280] truncate">{company.website_url}</p>
          )}
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
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Company name *" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors" />
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="Website URL" className="px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors" />
          </div>
          <div className="flex gap-3 items-start">
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="Logo URL *"
              className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white transition-colors"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-50"
            >
              {uploading ? '…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
          {logoUrl && (
            <img src={logoUrl} alt="preview" className="h-10 object-contain border border-black/10 p-1 bg-white" />
          )}
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <button type="submit" disabled={saving || !logoUrl} className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-150 disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MembersClient({
  adminUsers,
  superadmin,
  applicationsOpen,
  showPrices,
  priceCV: initialPriceCV,
  priceMaster: initialPriceMaster,
  priceCareer: initialPriceCareer,
  showAlumni,
  alumni: initialAlumni,
  alumniCompanies: initialAlumniCompanies,
}: {
  adminUsers: string[]
  superadmin: string
  applicationsOpen: boolean
  showPrices: boolean
  priceCV: string
  priceMaster: string
  priceCareer: string
  showAlumni: boolean
  alumni: Alumni[]
  alumniCompanies: AlumniCompany[]
}) {
  const router = useRouter()


  // Settings state
  const [appsOpen, setAppsOpen] = useState(applicationsOpen)
  const [togglingApps, setTogglingApps] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [pricesVisible, setPricesVisible] = useState(showPrices)
  const [togglingPrices, setTogglingPrices] = useState(false)
  const [priceToggleSaved, setPriceToggleSaved] = useState(false)

  const [alumniVisible, setAlumniVisible] = useState(showAlumni)
  const [togglingAlumni, setTogglingAlumni] = useState(false)
  const [alumniToggleSaved, setAlumniToggleSaved] = useState(false)

  const [priceCV, setPriceCV] = useState(initialPriceCV)
  const [priceMaster, setPriceMaster] = useState(initialPriceMaster)
  const [priceCareer, setPriceCareer] = useState(initialPriceCareer)
  const [savingPrices, setSavingPrices] = useState(false)
  const [pricesSaved, setPricesSaved] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)

  // Alumni companies state
  const [companiesList, setCompaniesList] = useState<AlumniCompany[]>(initialAlumniCompanies)
  const [companiesListOpen, setCompaniesListOpen] = useState(false)

  async function handleToggleApplications() {
    setTogglingApps(true)
    setSettingsSaved(false)
    const supabase = createClient()
    const newValue = !appsOpen
    await supabase
      .from('settings')
      .upsert({ key: 'applications_open', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setAppsOpen(newValue)
    setTogglingApps(false)
    setSettingsSaved(true)
  }

  async function handleTogglePrices() {
    setTogglingPrices(true)
    setPriceToggleSaved(false)
    const supabase = createClient()
    const newValue = !pricesVisible
    await supabase
      .from('settings')
      .upsert({ key: 'show_prices', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setPricesVisible(newValue)
    setTogglingPrices(false)
    setPriceToggleSaved(true)
  }

  async function handleToggleAlumni() {
    setTogglingAlumni(true)
    setAlumniToggleSaved(false)
    const supabase = createClient()
    const newValue = !alumniVisible
    await supabase
      .from('settings')
      .upsert({ key: 'show_alumni', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setAlumniVisible(newValue)
    setTogglingAlumni(false)
    setAlumniToggleSaved(true)
  }

  async function handleSavePrices(e: React.FormEvent) {
    e.preventDefault()
    setSavingPrices(true)
    setPricesSaved(false)
    setPricesError(null)
    const supabase = createClient()
    const rows = [
      { key: 'price_cv_review', value: priceCV },
      { key: 'price_master_orientation', value: priceMaster },
      { key: 'price_career_orientation', value: priceCareer },
    ]
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
    if (error) {
      setPricesError(error.message)
    } else {
      setPricesSaved(true)
      setTimeout(() => setPricesSaved(false), 3000)
    }
    setSavingPrices(false)
  }

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Admin users state
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(false)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const text = await res.text()
    let json: any = {}
    try { json = JSON.parse(text) } catch { json = { error: text } }

    if (!res.ok) {
      setInviteError(json.error ?? 'Unknown error')
    } else {
      setInviteEmail('')
      setInviteSuccess(true)
    }
    setInviting(false)
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    const email = newAdminEmail.trim().toLowerCase()
    if (!email) return
    setAddingAdmin(true)
    setAdminError(null)

    const supabase = createClient()
    const { error } = await supabase.from('admin_users').insert({ email })

    if (error) {
      setAdminError(error.message)
    } else {
      setNewAdminEmail('')
      router.refresh()
    }
    setAddingAdmin(false)
  }

  async function handleRemoveAdmin(email: string) {
    setRemovingEmail(email)
    const supabase = createClient()
    await supabase.from('admin_users').delete().eq('email', email)
    setRemovingEmail(null)
    router.refresh()
  }

  const navItems = [
    { label: 'Settings', id: 'settings' },
    { label: 'Alumni', id: 'alumni' },
    { label: 'Alumni Companies', id: 'alumni-companies' },
    { label: 'Invite Member', id: 'invite-member' },
    { label: 'Admin Users', id: 'admin-users' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">

      {/* ── Quick-nav pills ── */}
      <nav className="flex flex-wrap gap-2">
        {navItems.map(({ label, id }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="px-5 py-2 text-xs font-medium tracking-wide border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150 rounded-full"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════
          Settings
      ══════════════════════════════════════ */}
      <section id="settings">
        <SectionHeading title="Settings" />

        <div className="bg-white border border-black/10 p-8 space-y-6">
          {/* Applications Open */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Applications Open</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Enables or disables the application form on{' '}
                <span className="font-medium">/join-us</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {settingsSaved && <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>}
              <button
                onClick={handleToggleApplications}
                disabled={togglingApps}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${appsOpen ? 'bg-[#1a4a3a]' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={appsOpen}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${appsOpen ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Prices */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Show Prices – Career Service</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Mostra o nasconde i prezzi nella pagina{' '}
                <span className="font-medium">/career-service</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {priceToggleSaved && <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>}
              <button
                onClick={handleTogglePrices}
                disabled={togglingPrices}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${pricesVisible ? 'bg-[#1a4a3a]' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={pricesVisible}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${pricesVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Alumni Page */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Show Alumni Page</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Enables or disables the{' '}
                <span className="font-medium">/team/alumni</span> page and the link in{' '}
                <span className="font-medium">/team</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {alumniToggleSaved && <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>}
              <button
                onClick={handleToggleAlumni}
                disabled={togglingAlumni}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${alumniVisible ? 'bg-[#1a4a3a]' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={alumniVisible}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${alumniVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Prezzi Career Service */}
          <div>
            <p className="text-sm font-medium text-[#0a0a0a] mb-1">Prezzi Career Service</p>
            <p className="text-xs text-[#6b7280] mb-4">
              Valori mostrati nella pagina <span className="font-medium">/career-service</span>.
            </p>
            <form onSubmit={handleSavePrices} className="space-y-3">
              {[
                { label: 'CV Review', value: priceCV, setter: setPriceCV },
                { label: 'Master Orientation', value: priceMaster, setter: setPriceMaster },
                { label: 'Career Orientation', value: priceCareer, setter: setPriceCareer },
              ].map(({ label, value, setter }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-xs text-[#6b7280] w-40 flex-shrink-0">{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
                    placeholder="€29,99"
                  />
                </div>
              ))}
              {pricesError && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{pricesError}</p>
              )}
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPrices ? '…' : 'Save Prices'}
                </button>
                {pricesSaved && <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          Alumni
      ══════════════════════════════════════ */}
      <section id="alumni">
        <SectionHeading title="Alumni" />
        <AlumniList alumni={initialAlumni} />
      </section>

      {/* ══════════════════════════════════════
          Alumni Companies
      ══════════════════════════════════════ */}
      <section id="alumni-companies">
        <SectionHeading title="Alumni Companies" />
        <div className="space-y-6">
          <AlumniCompanyInsertForm
            onInserted={c => setCompaniesList(prev => [c, ...prev])}
          />
          <div>
            <button
              type="button"
              onClick={() => setCompaniesListOpen(v => !v)}
              className="flex items-center gap-3 w-full text-left group border border-black/10 bg-white px-4 py-3 hover:border-[#1a4a3a] transition-colors duration-150"
            >
              <span className="text-sm font-medium text-[#0a0a0a] group-hover:text-[#1a4a3a] transition-colors flex-1">
                Loghi aziende ({companiesList.length})
              </span>
              <svg
                className="w-4 h-4 text-[#9ca3af] transition-transform duration-200 flex-shrink-0"
                style={{ transform: companiesListOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div style={{ display: 'grid', gridTemplateRows: companiesListOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
              <div style={{ overflow: 'hidden' }}>
                <div className="bg-black/5 rounded-sm mt-4">
                  {companiesList.length === 0 ? (
                    <div className="bg-white px-6 py-8 text-center text-sm text-[#6b7280]">No companies yet.</div>
                  ) : (
                    companiesList.map(c => (
                      <AlumniCompanyRow
                        key={c.id}
                        company={c}
                        onUpdated={updated => setCompaniesList(prev => prev.map(x => x.id === updated.id ? updated : x))}
                        onDeleted={id => setCompaniesList(prev => prev.filter(x => x.id !== id))}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          Invite Member
      ══════════════════════════════════════ */}
      <section id="invite-member">
        <SectionHeading title="Invite Member" />

        <div className="bg-white border border-black/10 p-8">
          <p className="text-sm text-[#6b7280] mb-6">
            Send an invitation link by email. The new member will set their password by clicking the link.
          </p>

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="member@email.com"
              className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {inviting ? '…' : 'Send Invite'}
            </button>
          </form>

          {inviteError && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1 mt-4">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1 mt-4">Invite sent!</p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          Admin Users
      ══════════════════════════════════════ */}
      <section id="admin-users">
        <SectionHeading title="Admin Users" />

        <div className="bg-white border border-black/10 p-8 space-y-6">
          <form onSubmit={handleAddAdmin} className="flex gap-3">
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              placeholder="new@email.com"
              className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={addingAdmin}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {addingAdmin ? '…' : 'Add Admin'}
            </button>
          </form>

          {adminError && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{adminError}</p>
          )}

          <div className="space-y-px bg-black/5 rounded-sm">
            {adminUsers.map(email => (
              <div key={email} className="bg-white px-6 py-4 flex items-center justify-between gap-6">
                <span className="text-sm text-[#0a0a0a] font-medium">
                  {email}
                  {email === superadmin && (
                    <span className="ml-2 text-xs text-[#1a4a3a] tracking-widest uppercase">superadmin</span>
                  )}
                </span>
                {email !== superadmin && (
                  <button
                    onClick={() => handleRemoveAdmin(email)}
                    disabled={removingEmail === email}
                    className="flex-shrink-0 border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {removingEmail === email ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
