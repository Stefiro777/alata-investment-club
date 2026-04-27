'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const CATEGORIES = ['Legal', 'Delibere', 'Bilanci'] as const
type Category = typeof CATEGORIES[number]

type Doc = {
  id: string
  title: string
  description: string | null
  tags: string[]
  file_url: string | null
  file_name: string | null
  external_link: string | null
  year: number | null
  quarter: number | null
  uploaded_by: string | null
  created_at: string
}

// ── Upload ─────────────────────────────────────────────────────────────────────

async function uploadDoc(file: File): Promise<{ url: string; name: string } | { error: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/admin/upload-archive-doc', { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok) return { error: json.error ?? 'Upload failed' }
  return { url: json.url, name: file.name }
}

// ── Add document modal ─────────────────────────────────────────────────────────

function AddDocModal({
  userEmail,
  initialCategory,
  onSave,
  onClose,
}: {
  userEmail: string
  initialCategory: Category | null
  onSave: (doc: Doc) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category | null>(initialCategory)
  const [customTags, setCustomTags] = useState<string[]>([])
  const [customTagInput, setCustomTagInput] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [year, setYear] = useState('')
  const [quarter, setQuarter] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const result = await uploadDoc(file)
    if ('error' in result) { setError(result.error); setUploading(false); return }
    setFileUrl(result.url)
    setFileName(result.name)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    setUploading(false)
  }

  function addCustomTag(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = customTagInput.trim()
    if (!t || customTags.includes(t)) { setCustomTagInput(''); return }
    setCustomTags(prev => [...prev, t])
    setCustomTagInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !category) return

    if ((category === 'Legal' || category === 'Delibere') && !fileUrl) {
      setError('File obbligatorio per questa categoria.')
      return
    }
    if (category === 'Bilanci' && !fileUrl && !externalLink.trim()) {
      setError('Inserisci un file o un link esterno.')
      return
    }
    if (category === 'Delibere' && (!year || !quarter)) {
      setError('Anno e trimestre obbligatori per Delibere.')
      return
    }
    if (category === 'Bilanci' && !year) {
      setError('Anno obbligatorio per Bilanci.')
      return
    }

    setSaving(true)
    setError(null)
    const tags: string[] = [category, ...customTags]
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('admin_documents')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        tags,
        file_url: fileUrl || null,
        file_name: fileName || null,
        external_link: externalLink.trim() || null,
        year: year ? parseInt(year, 10) : null,
        quarter: quarter ? parseInt(quarter, 10) : null,
        uploaded_by: userEmail,
      })
      .select('*')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    onSave(data as Doc)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-line">
          <h3 className="font-serif text-xl font-bold text-ink-900">Aggiungi documento</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

          {/* Category selector */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
              Categoria *
            </label>
            <div className="flex gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 text-xs font-medium uppercase tracking-wide px-3 py-2 border transition-colors ${
                    category === cat
                      ? 'bg-forest text-white border-forest'
                      : 'border-line text-ink-500 hover:border-forest'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
              File{category === 'Bilanci' ? ' (opzionale se link esterno)' : ' *'}
            </label>
            <div className="flex gap-3 items-center">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-4 py-2.5 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {uploading ? 'Uploading…' : 'Scegli file'}
              </button>
              {fileName && <span className="text-xs text-ink-500 truncate flex-1">{fileName}</span>}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Titolo *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo documento"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Descrizione</label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Breve descrizione…"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white resize-none"
            />
          </div>

          {/* Delibere: year + quarter */}
          {category === 'Delibere' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Anno *</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  placeholder="2024"
                  min={2000}
                  max={2100}
                  className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Trimestre *</label>
                <select
                  required
                  value={quarter}
                  onChange={e => setQuarter(e.target.value)}
                  className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white appearance-none"
                >
                  <option value="" disabled>Seleziona…</option>
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </div>
            </div>
          )}

          {/* Bilanci: year + external link */}
          {category === 'Bilanci' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Anno *</label>
                <input
                  type="number"
                  required
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  placeholder="2024"
                  min={2000}
                  max={2100}
                  className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
                  Link esterno (es. Google Drive)
                </label>
                <input
                  type="url"
                  value={externalLink}
                  onChange={e => setExternalLink(e.target.value)}
                  placeholder="https://drive.google.com/…"
                  className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
                />
              </div>
            </div>
          )}

          {/* Custom tags */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Tag aggiuntivi</label>
            {customTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {customTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCustomTags(prev => prev.filter(t => t !== tag))}
                    className="text-xs px-3 py-1 border bg-[#1a4a3a]/10 text-forest border-forest/30 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            )}
            <input
              value={customTagInput}
              onChange={e => setCustomTagInput(e.target.value)}
              onKeyDown={addCustomTag}
              placeholder="Tag personalizzato (premi Invio)"
              className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving || !category}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Aggiungi documento'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Doc row ────────────────────────────────────────────────────────────────────

function DocRow({ doc, onDelete }: { doc: Doc; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const category = CATEGORIES.find(c => doc.tags.includes(c)) ?? null
  const ext = doc.file_name ? (doc.file_name.split('.').pop()?.toLowerCase() ?? '') : ''
  const isPdf = ext === 'pdf'
  const isDoc = ['doc', 'docx'].includes(ext)

  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors">
      {/* Type icon */}
      {doc.file_name ? (
        <a
          href={doc.file_url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center border cursor-pointer hover:border-forest hover:text-forest transition-colors ${isPdf ? 'border-red-200 bg-red-50' : isDoc ? 'border-blue-200 bg-blue-50' : 'border-line bg-paper-stone'}`}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest">{ext}</span>
        </a>
      ) : (
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-line bg-paper-stone">
          <svg className="w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900">{doc.title}</p>
        {doc.description && <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{doc.description}</p>}
        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
          {/* Year/quarter badge for Delibere */}
          {category === 'Delibere' && doc.year != null && (
            <span className="font-sans text-[10px] uppercase tracking-wide bg-paper-stone px-2 py-0.5 text-ink-500">
              {doc.year} · Q{doc.quarter}
            </span>
          )}
          {/* Year badge for Bilanci */}
          {category === 'Bilanci' && doc.year != null && (
            <span className="font-sans text-[10px] uppercase tracking-wide bg-paper-stone px-2 py-0.5 text-ink-500">
              {doc.year}
            </span>
          )}
          {/* Custom tags (exclude category tags) */}
          {doc.tags
            .filter(t => !(CATEGORIES as readonly string[]).includes(t))
            .map(tag => (
              <span key={tag} className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 border border-line text-ink-500">
                {tag}
              </span>
            ))}
        </div>
        <p className="text-[10px] text-ink-400 mt-1">
          {doc.uploaded_by} · {new Date(doc.created_at).toLocaleDateString('it-IT')}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {doc.file_url && (
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors"
          >
            Download
          </a>
        )}
        {doc.external_link && (
          <a
            href={doc.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors"
          >
            Apri ↗
          </a>
        )}
        <button
          onClick={async () => {
            if (!confirm(`Eliminare "${doc.title}"?`)) return
            setDeleting(true)
            onDelete()
          }}
          disabled={deleting}
          className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors disabled:opacity-40"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

// ── Category section ───────────────────────────────────────────────────────────

function CategorySection({
  category,
  docs,
  onUpload,
  onDelete,
}: {
  category: Category
  docs: Doc[]
  onUpload: (cat: Category) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(true)

  const sorted = [...docs].sort((a, b) => {
    if (category === 'Legal') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (category === 'Delibere') {
      if ((b.year ?? 0) !== (a.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0)
      return (b.quarter ?? 0) - (a.quarter ?? 0)
    }
    // Bilanci — by year desc
    return (b.year ?? 0) - (a.year ?? 0)
  })

  return (
    <div className="border-t border-line">
      {/* Header row */}
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 flex-1 text-left group"
        >
          <h3 className="font-serif text-xl text-ink-900 group-hover:text-forest transition-colors">
            {category}
          </h3>
          <span className="text-xs text-ink-400">{docs.length}</span>
          <svg
            className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onUpload(category)}
          className="inline-flex items-center gap-1.5 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-4 py-2 transition-colors flex-shrink-0"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </button>
      </div>

      {/* Collapsible body */}
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {sorted.length === 0 ? (
            <div className="bg-white border border-line-faint px-6 py-8 text-center text-sm text-ink-500 mb-4">
              Nessun documento in questa categoria.
            </div>
          ) : (
            <div className="bg-white border border-line-faint mb-4">
              {sorted.map(doc => (
                <DocRow key={doc.id} doc={doc} onDelete={() => onDelete(doc.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main client ────────────────────────────────────────────────────────────────

export default function ArchiveClient({ initialDocs, userEmail }: { initialDocs: Doc[]; userEmail: string }) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalCategory, setModalCategory] = useState<Category | null>(null)

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('admin_documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  function openModal(cat: Category) {
    setModalCategory(cat)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setModalCategory(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink-900">Archivio Documenti</h2>
        <div className="w-10 h-0.5 bg-forest mt-2" />
        <p className="text-xs text-ink-500 mt-3">Documenti interni — PDF, DOCX, immagini. Visibile solo agli admin.</p>
      </div>

      <div>
        {CATEGORIES.map(cat => (
          <CategorySection
            key={cat}
            category={cat}
            docs={docs.filter(d => d.tags.includes(cat))}
            onUpload={openModal}
            onDelete={handleDelete}
          />
        ))}
        <div className="border-t border-line" />
      </div>

      {modalOpen && (
        <AddDocModal
          userEmail={userEmail}
          initialCategory={modalCategory}
          onSave={doc => { setDocs(prev => [doc, ...prev]); closeModal() }}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
