'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { AlumniCompany } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

// ── Logo upload helper ─────────────────────────────────────────────────────────

async function uploadAlumniLogo(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage.from('alumni-logos').upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('alumni-logos').getPublicUrl(data.path)
  return { url: publicUrl }
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
    <form onSubmit={handleSubmit} className="bg-white border border-line-faint p-6 space-y-4">
      <p className="text-xs font-medium tracking-wide text-ink-500 uppercase mb-2">Add Company</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <input
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Company name *"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
        />
        <input
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
          placeholder="Website URL"
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
        />
      </div>

      {/* Logo */}
      <div className="space-y-2">
        <p className="text-xs text-ink-500">Logo *</p>
        <div className="flex gap-3 items-start">
          <input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            placeholder="Logo URL or upload below"
            className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast disabled:opacity-50"
          >
            {uploading ? '…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>
        {logoUrl && (
          <img src={logoUrl} alt="preview" className="h-10 object-contain border border-line-faint p-1 bg-white" />
        )}
      </div>

      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <button
        type="submit"
        disabled={saving || !logoUrl}
        className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
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
    if (!String(name ?? '').trim() || !String(logoUrl ?? '').trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('alumni_companies')
      .update({
        name: String(name ?? '').trim(),
        logo_url: String(logoUrl ?? '').trim(),
        website_url: String(websiteUrl ?? '').trim() || null,
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
        <img src={company.logo_url} alt={company.name} className="w-10 h-10 object-contain flex-shrink-0 border border-line-faint p-1" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{company.name}</p>
          {company.website_url && (
            <p className="text-xs text-ink-500 truncate">{company.website_url}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setOpen(o => !o)}
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors duration-fast"
          >
            {open ? 'Close' : 'Edit'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors duration-fast disabled:opacity-40"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={handleSave} className="px-6 pb-5 pt-2 border-t border-black/5 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="Company name *" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors" />
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="Website URL" className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors" />
          </div>
          <div className="flex gap-3 items-start">
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="Logo URL *"
              className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast disabled:opacity-50"
            >
              {uploading ? '…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
          {logoUrl && (
            <img src={logoUrl} alt="preview" className="h-10 object-contain border border-line-faint p-1 bg-white" />
          )}
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <button type="submit" disabled={saving || !logoUrl} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-fast disabled:opacity-50">
            {saving ? '…' : 'Save'}
          </button>
        </form>
      )}
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export default function AlumniCompaniesSection({ initialCompanies }: { initialCompanies: AlumniCompany[] }) {
  const [companiesList, setCompaniesList] = useState<AlumniCompany[]>(initialCompanies)
  const [companiesListOpen, setCompaniesListOpen] = useState(false)

  return (
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
            className="flex items-center gap-3 w-full text-left group border border-line-faint bg-white px-4 py-3 hover:border-forest transition-colors duration-fast"
          >
            <span className="text-sm font-medium text-ink-900 group-hover:text-forest transition-colors flex-1">
              Loghi aziende ({companiesList.length})
            </span>
            <svg
              className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0"
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
                  <div className="bg-white px-6 py-8 text-center text-sm text-ink-500">No companies yet.</div>
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
  )
}
