'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { Partner } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#1a4a3a]">{title}</h2>
      <div className="w-8 h-px bg-[#1a4a3a] mt-2" />
    </div>
  )
}

// ── Partner helpers ───────────────────────────────────────────────────────────

async function uploadPartnerLogo(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage.from('partners').upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('partners').getPublicUrl(data.path)
  return { url: publicUrl }
}

function PartnerInsertForm({ onInserted }: { onInserted: (p: Partner) => void }) {
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
    setUploading(true); setError(null)
    const result = await uploadPartnerLogo(file)
    if ('error' in result) { setError(result.error) } else { setLogoUrl(result.url) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !logoUrl.trim()) return
    setSaving(true); setError(null)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('partners')
      .insert({ name: name.trim(), logo_url: logoUrl.trim(), website_url: websiteUrl.trim() || null })
      .select('id, name, logo_url, website_url, order_index, created_at')
      .single()
    if (error) { setError(error.message) } else {
      onInserted(data as Partner)
      setName(''); setLogoUrl(''); setWebsiteUrl('')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#6b7280] mb-1">Name *</label>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Partner name"
            className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs text-[#6b7280] mb-1">Website URL</label>
          <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://…"
            className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#6b7280] mb-1">Logo *</label>
          <div className="flex gap-2">
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://… or upload"
              className="flex-1 px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-150 disabled:opacity-50 whitespace-nowrap">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="preview" className="mt-2 h-10 object-contain border border-[#e5e5e5] p-1 bg-white" />
          )}
        </div>
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <button type="submit" disabled={saving || !logoUrl}
        className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50">
        {saving ? '…' : 'Add Partner'}
      </button>
    </form>
  )
}

function PartnerEditRow({ partner, onUpdated, onDeleted, showDragHandle }: {
  partner: Partner
  onUpdated: (p: Partner) => void
  onDeleted: (id: string) => void
  showDragHandle?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(partner.name)
  const [logoUrl, setLogoUrl] = useState(partner.logo_url)
  const [websiteUrl, setWebsiteUrl] = useState(partner.website_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(null)
    const result = await uploadPartnerLogo(file)
    if ('error' in result) { setError(result.error) } else { setLogoUrl(result.url) }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false); setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('partners')
      .update({ name: name.trim(), logo_url: logoUrl.trim(), website_url: websiteUrl.trim() || null })
      .eq('id', partner.id)
    if (err) { setError(err.message) } else {
      onUpdated({ ...partner, name: name.trim(), logo_url: logoUrl.trim(), website_url: websiteUrl.trim() || null })
      setSaved(true); setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${partner.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('partners').delete().eq('id', partner.id)
    onDeleted(partner.id)
  }

  return (
    <div className="bg-white border border-black/10 mb-px">
      <div className="flex items-center gap-3 px-4 py-3">
        {showDragHandle && (
          <div className="cursor-grab active:cursor-grabbing text-[#9ca3af] hover:text-[#1a4a3a] transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
              <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
            </svg>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={partner.logo_url} alt={partner.name} className="w-8 h-8 object-contain flex-shrink-0 border border-[#e5e5e5] p-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#0a0a0a] truncate">{partner.name}</p>
            <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5">{partner.click_count ?? 0} click</span>
          </div>
          {partner.website_url && <p className="text-xs text-[#6b7280] truncate">{partner.website_url}</p>}
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-xs text-[#1a4a3a] border border-[#1a4a3a] px-3 py-1.5 hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150">
          {expanded ? 'Close' : 'Edit'}
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="flex-shrink-0 text-xs text-red-500 border border-red-300 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-colors duration-150 disabled:opacity-40">
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
      {expanded && (
        <form onSubmit={handleUpdate} className="border-t border-black/5 px-4 py-4 space-y-3 bg-[#fafafa]">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Website URL</label>
              <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://…"
                className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-[#6b7280] mb-1">Logo</label>
              <div className="flex gap-2">
                <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-150 disabled:opacity-50">
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="preview" className="mt-2 h-10 object-contain border border-[#e5e5e5] p-1 bg-white" />
              )}
            </div>
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-150 disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>}
          </div>
        </form>
      )}
    </div>
  )
}

function PartnerDraggableList({
  initialPartners, open, onToggle,
}: {
  initialPartners: Partner[]; open: boolean; onToggle: () => void
}) {
  const [list, setList] = useState<Partner[]>(initialPartners)
  const listRef = useRef<Partner[]>(list)
  listRef.current = list
  const dragIndex = useRef<number | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  function onDragStart(index: number) { dragIndex.current = index }

  async function onDrop(index: number) {
    const from = dragIndex.current
    if (from === null || from === index) { dragIndex.current = null; return }
    const next = [...listRef.current]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    dragIndex.current = null
    setList(next)
    setSavingOrder(true); setOrderError(null)
    const supabase = createClient()
    const results = await Promise.all(
      next.map((p, i) => supabase.from('partners').update({ order_index: i }).eq('id', p.id))
    )
    setSavingOrder(false)
    const failed = results.find(r => r.error)
    if (failed?.error) setOrderError(failed.error.message)
  }

  return (
    <div>
      <button type="button" onClick={onToggle} className="flex items-center gap-3 group w-full text-left">
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280]">Partner ({list.length})</p>
        {savingOrder && <span className="text-xs text-[#9ca3af]">Saving…</span>}
        {orderError && <span className="text-xs text-red-500">{orderError}</span>}
        <svg className="w-3.5 h-3.5 text-[#9ca3af] transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {list.length === 0 ? (
            <p className="text-[#6b7280] text-sm pt-4 pb-1">Nessun partner ancora.</p>
          ) : (
            <div className="pt-4 space-y-px">
              {list.map((p, i) => (
                <div key={p.id} draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => onDrop(i)}>
                  <PartnerEditRow
                    partner={p}
                    showDragHandle
                    onUpdated={updated => setList(prev => prev.map(x => x.id === updated.id ? updated : x))}
                    onDeleted={id => setList(prev => prev.filter(x => x.id !== id))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export default function PartnersSection({ initialPartners }: { initialPartners: Partner[] }) {
  const [partnersList, setPartnersList] = useState<Partner[]>(initialPartners)
  const [partnersOpen, setPartnersOpen] = useState(true)

  return (
    <section id="partners">
      <SectionHeading title="Partners" />
      <div className="bg-white border border-black/10 p-8 space-y-8">
        <PartnerInsertForm onInserted={p => setPartnersList(prev => [...prev, p])} />
        <div className="border-t border-black/10" />
        <PartnerDraggableList
          key={partnersList.length}
          initialPartners={partnersList}
          open={partnersOpen}
          onToggle={() => setPartnersOpen(v => !v)}
        />
      </div>
    </section>
  )
}
