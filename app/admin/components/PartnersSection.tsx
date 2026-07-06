'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Partner, PartnerDocument } from '@/lib/types'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

// ── Document helpers ──────────────────────────────────────────────────────────

function PartnerDocumentsSection({ partnerId }: { partnerId: string }) {
  const [docs, setDocs] = useState<PartnerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [docName, setDocName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const docFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('partner_documents')
      .select('id, partner_id, name, file_url, preview_count, created_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setDocs((data ?? []) as PartnerDocument[]); setLoading(false) })
  }, [partnerId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !docName.trim()) { setUploadError('Inserisci un nome per il documento'); return }
    setUploading(true); setUploadError(null)
    const supabase = createClient()
    const path = `${partnerId}/${Date.now()}-${file.name}`
    const { error: storageErr } = await supabase.storage.from('partner-documents').upload(path, file)
    if (storageErr) { setUploadError(storageErr.message); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('partner-documents').getPublicUrl(path)
    const { data: inserted, error: dbErr } = await supabase
      .from('partner_documents')
      .insert({ partner_id: partnerId, name: docName.trim(), file_url: publicUrl, preview_count: 0 })
      .select('id, partner_id, name, file_url, preview_count, created_at')
      .single()
    if (dbErr) { setUploadError(dbErr.message) } else {
      setDocs(prev => [...prev, inserted as PartnerDocument])
      setDocName('')
      if (docFileRef.current) docFileRef.current.value = ''
    }
    setUploading(false)
  }

  async function handleDelete(docId: string) {
    const supabase = createClient()
    await supabase.from('partner_documents').delete().eq('id', docId)
    setDocs(prev => prev.filter(d => d.id !== docId))
    setConfirmDeleteId(null)
  }

  return (
    <div className="sm:col-span-2 border-t border-black/5 pt-3 mt-1">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-3">Documenti</p>
      {loading ? (
        <p className="text-xs text-ink-400">Caricamento…</p>
      ) : docs.length === 0 ? (
        <p className="text-xs text-ink-400 mb-3">Nessun documento.</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {docs.map(doc => (
            <li key={doc.id} className="flex items-center gap-2 text-xs bg-white border border-line px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                className="flex-1 font-medium text-ink-900 hover:text-forest hover:underline truncate">
                {doc.name}
              </a>
              <span className="flex-shrink-0 text-ink-400">{doc.preview_count} visualizzazioni</span>
              {confirmDeleteId === doc.id ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleDelete(doc.id)}
                    className="text-red-600 border border-red-300 px-2 py-0.5 hover:bg-red-600 hover:text-white transition-colors">
                    Conferma
                  </button>
                  <button onClick={() => setConfirmDeleteId(null)}
                    className="text-ink-500 border border-line px-2 py-0.5 hover:border-ink-400 transition-colors">
                    Annulla
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDeleteId(doc.id)}
                  className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Upload form */}
      <div className="flex gap-2 items-start">
        <input
          value={docName}
          onChange={e => setDocName(e.target.value)}
          placeholder="Nome documento *"
          className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-xs bg-white"
        />
        <button
          type="button"
          onClick={() => { if (!docName.trim()) { setUploadError('Inserisci un nome'); return } docFileRef.current?.click() }}
          disabled={uploading}
          className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-fast disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Uploading…' : 'Carica file'}
        </button>
        <input ref={docFileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden" onChange={handleUpload} />
      </div>
      {uploadError && <p className="text-red-600 text-xs mt-1 border-l-2 border-red-400 pl-2">{uploadError}</p>}
    </div>
  )
}

// ── Partner helpers ───────────────────────────────────────────────────────────

async function uploadPartnerLogo(file: File): Promise<{ url: string } | { error: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/admin/upload-partner-logo', { method: 'POST', body: formData })
  const json = await res.json()
  if (!res.ok) return { error: json.error ?? 'Upload failed' }
  console.log('[uploadPartnerLogo] url ricevuto:', json.url)
  return { url: json.url }
}

function PartnerInsertForm({ onInserted }: { onInserted: (p: Partner) => void }) {
  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'sponsor' | 'partner'>('sponsor')
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
      .insert({
        name: name.trim(),
        logo_url: logoUrl.trim(),
        website_url: websiteUrl.trim() || null,
        description: description.trim() || null,
        type,
      })
      .select('id, name, logo_url, website_url, description, type, order_index, click_count, created_at')
      .single()
    if (error) { setError(error.message) } else {
      onInserted(data as Partner)
      setName(''); setLogoUrl(''); setWebsiteUrl(''); setDescription(''); setType('sponsor')
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="block text-xs text-ink-500 mb-2">Type *</label>
        <div className="flex gap-2">
          {(['sponsor', 'partner'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`text-xs font-medium uppercase tracking-wide px-4 py-2 border transition-colors ${type === t ? 'bg-forest text-white border-forest' : 'border-line text-ink-500 hover:border-forest'}`}
            >
              {t === 'sponsor' ? 'Sponsor' : 'Partner'}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink-400 mt-1">
          {type === 'sponsor' ? 'Appare nel logo marquee (Sponsors)' : 'Appare nelle card con descrizione (Partners)'}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Name *</label>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Nome partner"
            className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Website URL</label>
          <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://…"
            className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-ink-500 mb-1">Logo *</label>
          <div className="flex gap-2">
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://… or upload"
              className="flex-1 px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-fast disabled:opacity-50 whitespace-nowrap">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="preview" className="mt-2 h-10 object-contain border border-line p-1 bg-white" />
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-ink-500 mb-1">Description</label>
          <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Breve descrizione (visibile nella card pubblica)…"
            className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white resize-none" />
        </div>
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <button type="submit" disabled={saving || !logoUrl}
        className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50">
        {saving ? '…' : 'Add'}
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
  const [description, setDescription] = useState(partner.description ?? '')
  const [type, setType] = useState<'sponsor' | 'partner'>(partner.type ?? 'sponsor')
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
      .update({
        name: name.trim(),
        logo_url: logoUrl.trim(),
        website_url: websiteUrl.trim() || null,
        description: description.trim() || null,
        type,
      })
      .eq('id', partner.id)
    if (err) { setError(err.message) } else {
      onUpdated({ ...partner, name: name.trim(), logo_url: logoUrl.trim(), website_url: websiteUrl.trim() || null, description: description.trim() || null, type })
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
    <div className="bg-white border border-line-faint mb-px">
      <div className="flex items-center gap-3 px-4 py-3">
        {showDragHandle && (
          <div className="cursor-grab active:cursor-grabbing text-ink-400 hover:text-forest transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
              <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
            </svg>
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={partner.logo_url} alt={partner.name} className="w-8 h-8 object-contain flex-shrink-0 border border-line p-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-ink-900 truncate">{partner.name}</p>
            <span className={`flex-shrink-0 text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 ${partner.type === 'partner' ? 'bg-forest/10 text-forest' : 'bg-gray-100 text-gray-600'}`}>
              {partner.type === 'partner' ? 'Partner' : 'Sponsor'}
            </span>
            <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5">{partner.click_count ?? 0} click</span>
          </div>
          {partner.website_url && <p className="text-xs text-ink-500 truncate">{partner.website_url}</p>}
        </div>
        <button onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-xs text-forest border border-forest px-3 py-1.5 hover:bg-forest hover:text-white transition-colors duration-fast">
          {expanded ? 'Close' : 'Edit'}
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="flex-shrink-0 text-xs text-red-500 border border-red-300 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-colors duration-fast disabled:opacity-40">
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
      {expanded && (
        <form onSubmit={handleUpdate} className="border-t border-black/5 px-4 py-4 space-y-3 bg-paper-cool">
          {/* Type */}
          <div>
            <label className="block text-xs text-ink-500 mb-2">Type</label>
            <div className="flex gap-2">
              {(['sponsor', 'partner'] as const).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 border transition-colors ${type === t ? 'bg-forest text-white border-forest' : 'border-line text-ink-500 hover:border-forest'}`}>
                  {t === 'sponsor' ? 'Sponsor' : 'Partner'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1">Name</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">Website URL</label>
              <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://…"
                className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-ink-500 mb-1">Logo</label>
              <div className="flex gap-2">
                <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-fast disabled:opacity-50">
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="preview" className="mt-2 h-10 object-contain border border-line p-1 bg-white" />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-ink-500 mb-1">Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Breve descrizione…"
                className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white resize-none" />
            </div>
            {type === 'sponsor' && (
              <PartnerDocumentsSection partnerId={partner.id} />
            )}
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-fast disabled:opacity-50">
              {saving ? '…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-forest font-medium">Saved</span>}
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
        <p className="text-xs tracking-[0.2em] uppercase text-ink-500">Partner ({list.length})</p>
        {savingOrder && <span className="text-xs text-ink-400">Saving…</span>}
        {orderError && <span className="text-xs text-red-500">{orderError}</span>}
        <svg className="w-3.5 h-3.5 text-ink-400 transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {list.length === 0 ? (
            <p className="text-ink-500 text-sm pt-4 pb-1">Nessun partner ancora.</p>
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
      <div className="bg-white border border-line-faint p-8 space-y-8">
        <PartnerInsertForm onInserted={p => setPartnersList(prev => [...prev, p])} />
        <div className="border-t border-line-faint" />
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
