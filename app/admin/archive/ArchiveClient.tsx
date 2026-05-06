'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const CATEGORIES = ['Legal', 'Delibere', 'Contratti', 'Bilanci'] as const
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
  folder_id: string | null
}

// Sostituire con l'URL della cartella Google Drive Contabilità
const ACCOUNTING_DRIVE_URL = 'https://drive.google.com/drive/folders/1Yby27SlRfL2AMFiAgB4RdmjBQ1_SndX8?usp=drive_link'

type AccountingDoc = {
  id: string
  name: string
  file_url: string
  quarter: string   // 'Q1' | 'Q2' | 'Q3' | 'Q4'
  year: number
  created_at: string
  created_by: string | null
}

type Folder = {
  id: string
  name: string
  category: string
  created_at: string
}

// ── Signed URL helpers ─────────────────────────────────────────────────────────

async function openDoc(filePath: string | null) {
  if (!filePath) return
  if (filePath.startsWith('http')) { window.open(filePath, '_blank'); return }
  const res = await fetch(`/api/admin/archive-signed-url?path=${encodeURIComponent(filePath)}`)
  const json = await res.json()
  if (json.signedUrl) window.open(json.signedUrl, '_blank')
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

async function uploadAccountingFile(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('accounting-documents').upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data } = supabase.storage.from('accounting-documents').getPublicUrl(path)
  return { url: data.publicUrl }
}

// ── Custom select ─────────────────────────────────────────────────────────────

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-[#1a4a3a] bg-white text-sm text-gray-900 focus:outline-none"
      >
        <span className={selected ? 'text-gray-900' : 'text-ink-400'}>
          {selected?.label ?? placeholder ?? 'Seleziona…'}
        </span>
        <svg className="w-4 h-4 text-[#1a4a3a] flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-[#1a4a3a] border-t-0 shadow-lg">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                value === opt.value
                  ? 'bg-[#1a4a3a] text-white'
                  : 'text-gray-900 hover:bg-[#1a4a3a]/10'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [year, setYear] = useState('')
  const [quarter, setQuarter] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (category !== 'Contratti') return
    createClient()
      .from('archive_folders')
      .select('*')
      .eq('category', 'Contratti')
      .order('name')
      .then(({ data }) => setFolders(data ?? []))
  }, [category])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !category) return

    if ((category === 'Legal' || category === 'Delibere' || category === 'Contratti') && !fileUrl) {
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
    const tags: string[] = [category]
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
        folder_id: selectedFolder,
      })
      .select('*')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    onSave(data as Doc)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 pb-4 bg-black/60 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-line flex-shrink-0">
          <h3 className="font-serif text-xl font-bold text-ink-900">Aggiungi documento</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5 overflow-y-auto flex-1">

          {/* Category — preimpostata, non modificabile */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
              Categoria
            </label>
            <p className="text-sm font-semibold text-ink-900 uppercase tracking-wide">{category}</p>
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
                <CustomSelect
                  value={quarter}
                  onChange={setQuarter}
                  placeholder="Seleziona…"
                  options={[
                    { value: '1', label: 'Q1' },
                    { value: '2', label: 'Q2' },
                    { value: '3', label: 'Q3' },
                    { value: '4', label: 'Q4' },
                  ]}
                />
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


          {category === 'Contratti' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1 font-['Inter']">Cartella (opzionale)</label>
              <select
                value={selectedFolder ?? ''}
                onChange={e => setSelectedFolder(e.target.value || null)}
                className="w-full border border-[#1a4a3a] px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black appearance-none"
              >
                <option value="">Nessuna cartella</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}

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

function DocRow({ doc, onDelete, onOpen, hideYearQuarter }: { doc: Doc; onDelete: () => void; onOpen?: () => void; hideYearQuarter?: boolean }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDownload() {
    if (!doc.file_url) return
    let url: string
    if (doc.file_url.startsWith('http')) {
      url = doc.file_url
    } else {
      const res = await fetch(`/api/admin/archive-signed-url?path=${encodeURIComponent(doc.file_url)}`)
      const json = await res.json()
      if (!json.signedUrl) return
      url = json.signedUrl
    }
    const a = document.createElement('a')
    a.href = url
    a.download = doc.file_name ?? 'download'
    a.click()
  }

  const category = CATEGORIES.find(c => doc.tags.includes(c)) ?? null
  const ext = doc.file_name ? (doc.file_name.split('.').pop()?.toLowerCase() ?? '') : ''
  const isPdf = ext === 'pdf'
  const isDoc = ['doc', 'docx'].includes(ext)

  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors">
      {/* Type icon */}
      {doc.file_name ? (
        <button
          type="button"
          onClick={() => onOpen?.()}
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center border cursor-pointer hover:border-forest hover:text-forest transition-colors ${isPdf ? 'border-red-200 bg-red-50' : isDoc ? 'border-blue-200 bg-blue-50' : 'border-line bg-paper-stone'}`}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest">{ext}</span>
        </button>
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
          {!hideYearQuarter && category === 'Delibere' && doc.year != null && (
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
          <button
            type="button"
            onClick={handleDownload}
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors"
          >
            Download
          </button>
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
  const [open, setOpen] = useState(false)
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)

  useEffect(() => {
    if (category !== 'Contratti') return
    createClient()
      .from('archive_folders')
      .select('*')
      .eq('category', 'Contratti')
      .order('name')
      .then(({ data }) => setFolders(data ?? []))
  }, [category])

  async function createFolder() {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('archive_folders')
      .insert({ name: newFolderName.trim(), category: 'Contratti', created_by: user?.id })
      .select()
      .single()
    if (data) setFolders(prev => [...prev, data as Folder].sort((a, b) => a.name.localeCompare(b.name)))
    setNewFolderName('')
    setShowNewFolderInput(false)
    setCreatingFolder(false)
  }

  async function deleteFolder(folderId: string) {
    const supabase = createClient()
    await supabase.from('archive_folders').delete().eq('id', folderId)
    setFolders(prev => prev.filter(f => f.id !== folderId))
    if (selectedFolder === folderId) setSelectedFolder(null)
    setFolderToDelete(null)
  }

  const sorted = [...docs].sort((a, b) => {
    if (category === 'Legal' || category === 'Contratti') {
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
          {docs.length === 0 ? (
            <div className="bg-white border border-line-faint px-6 py-8 text-center text-sm text-ink-500 mb-4">
              Nessun documento in questa categoria.
            </div>
          ) : category === 'Delibere' ? (
            <div className="bg-white border border-line-faint mb-4 px-6 pb-4">
              {(() => {
                const years = [...new Set(docs.map(d => d.year).filter((y): y is number => y != null))].sort((a, b) => b - a)
                return years.map(year => {
                  const yearDocs = docs.filter(d => d.year === year)
                  const quarters = [...new Set(yearDocs.map(d => d.quarter).filter((q): q is number => q != null))].sort((a, b) => b - a)
                  return (
                    <div key={year}>
                      <h3 className="font-serif text-2xl font-semibold text-ink-900 mt-8 mb-2 pb-2 border-b border-line">{year}</h3>
                      {quarters.map(quarter => {
                        const qDocs = yearDocs
                          .filter(d => d.quarter === quarter)
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        return (
                          <div key={quarter}>
                            <p className="font-sans text-xs uppercase tracking-[0.15em] text-ink-500 mt-5 mb-3">{quarter}Q</p>
                            {qDocs.map(doc => (
                              <DocRow key={doc.id} doc={doc} onDelete={() => onDelete(doc.id)} onOpen={() => openDoc(doc.file_url)} hideYearQuarter />
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              })()}
            </div>
          ) : category === 'Contratti' ? (
            <div className="bg-white border border-line-faint mb-4 px-6 py-4">
              {/* Barra cartelle */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`text-xs px-3 py-1.5 border font-['Inter'] uppercase tracking-widest transition-colors ${selectedFolder === null ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]' : 'bg-white text-[#1a4a3a] border-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white'}`}
                >
                  Tutti
                </button>
                {folders.map(f => (
                  <div key={f.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedFolder(f.id)}
                      className={`text-xs px-3 py-1.5 border font-['Inter'] uppercase tracking-widest transition-colors ${selectedFolder === f.id ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]' : 'bg-white text-[#1a4a3a] border-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white'}`}
                    >
                      📁 {f.name}
                    </button>
                    <button
                      onClick={() => setFolderToDelete(f.id)}
                      className="text-gray-400 hover:text-red-500 text-xs"
                      aria-label="Elimina cartella"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {showNewFolderInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createFolder()}
                      placeholder="Nome cartella..."
                      className="border border-[#1a4a3a] px-2 py-1 text-xs font-['Inter'] focus:outline-none w-36"
                      autoFocus
                    />
                    <button onClick={createFolder} disabled={creatingFolder} className="text-xs text-[#1a4a3a] font-semibold hover:underline font-['Inter']">
                      {creatingFolder ? '...' : 'Crea'}
                    </button>
                    <button onClick={() => { setShowNewFolderInput(false); setNewFolderName('') }} className="text-xs text-gray-400 hover:text-black font-['Inter']">
                      Annulla
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewFolderInput(true)}
                    className="text-xs text-[#1a4a3a] border border-dashed border-[#1a4a3a] px-3 py-1.5 hover:bg-[#1a4a3a] hover:text-white transition-colors font-['Inter']"
                  >
                    + Nuova cartella
                  </button>
                )}
              </div>

              {/* Conferma eliminazione cartella */}
              {folderToDelete && (
                <div className="mb-4 p-3 border border-red-200 bg-red-50 text-sm font-['Inter'] flex items-center justify-between">
                  <span className="text-red-700">Eliminare questa cartella? I documenti al suo interno non verranno eliminati.</span>
                  <div className="flex gap-3">
                    <button onClick={() => deleteFolder(folderToDelete)} className="text-red-600 font-semibold hover:underline">Sì, elimina</button>
                    <button onClick={() => setFolderToDelete(null)} className="text-gray-500 hover:underline">Annulla</button>
                  </div>
                </div>
              )}

              {/* Documenti filtrati */}
              {(() => {
                const filtered = selectedFolder
                  ? sorted.filter(doc => doc.folder_id === selectedFolder)
                  : sorted
                return filtered.length === 0 ? (
                  <div className="py-4 text-center text-sm text-ink-500">Nessun documento.</div>
                ) : (
                  <div className="-mx-6">
                    {filtered.map(doc => (
                      <DocRow key={doc.id} doc={doc} onDelete={() => onDelete(doc.id)} onOpen={() => openDoc(doc.file_url)} />
                    ))}
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="bg-white border border-line-faint mb-4">
              {sorted.map(doc => (
                <DocRow key={doc.id} doc={doc} onDelete={() => onDelete(doc.id)} onOpen={() => openDoc(doc.file_url)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Contabilità: upload modal ─────────────────────────────────────────────────

function AccountingUploadModal({
  userEmail,
  onSave,
  onClose,
}: {
  userEmail: string
  onSave: (doc: AccountingDoc) => void
  onClose: () => void
}) {
  const [name, setName]       = useState('')
  const [quarter, setQuarter] = useState('Q1')
  const [year, setYear]       = useState(String(new Date().getFullYear()))
  const [fileUrl, setFileUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const result = await uploadAccountingFile(file)
    if ('error' in result) { setError(result.error); setUploading(false); return }
    setFileUrl(result.url)
    setFileName(file.name)
    if (!name) setName(file.name.replace(/\.[^.]+$/, ''))
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !fileUrl) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('accounting_documents')
      .insert({ name: name.trim(), file_url: fileUrl, quarter, year: parseInt(year, 10), created_by: userEmail })
      .select('*')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    onSave(data as AccountingDoc)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-line">
          <h3 className="font-serif text-xl font-bold text-ink-900">Carica documento</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          {/* File */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">File *</label>
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
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Nome *</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome documento"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>

          {/* Quarter + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Quarter *</label>
              <CustomSelect
                value={quarter}
                onChange={setQuarter}
                options={['Q1', 'Q2', 'Q3', 'Q4'].map(q => ({ value: q, label: q }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Anno *</label>
              <CustomSelect
                value={year}
                onChange={setYear}
                options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))}
              />
            </div>
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving || !fileUrl}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Carica'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Contabilità: doc row ──────────────────────────────────────────────────────

function AccountingDocRow({
  doc,
  onDelete,
}: {
  doc: AccountingDoc
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const ext = doc.file_url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? ''
  const isPdf = ext === 'pdf'

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    // Remove from storage: extract path after bucket name in URL
    const storagePath = doc.file_url.split('/accounting-documents/')[1]?.split('?')[0]
    if (storagePath) await supabase.storage.from('accounting-documents').remove([storagePath])
    await supabase.from('accounting_documents').delete().eq('id', doc.id)
    onDelete()
  }

  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors">
      {/* File icon */}
      <button
        type="button"
        onClick={() => window.open(doc.file_url, '_blank')}
        className={`flex-shrink-0 w-9 h-9 flex items-center justify-center border cursor-pointer hover:border-forest hover:text-forest transition-colors ${isPdf ? 'border-red-200 bg-red-50' : 'border-line bg-paper-stone'}`}
        title="Apri documento"
      >
        <span className="text-[9px] font-bold uppercase tracking-widest">{ext || 'doc'}</span>
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900 truncate">{doc.name}</p>
        <p className="text-[10px] text-ink-400 mt-0.5">
          {new Date(doc.created_at).toLocaleDateString('it-IT')}
          {doc.created_by ? ` · ${doc.created_by}` : ''}
        </p>
      </div>

      {/* Delete */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {confirmDel ? (
          <>
            <span className="text-xs text-ink-500">Eliminare?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              {deleting ? '…' : 'Sì'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(false)}
              className="border border-line text-ink-500 hover:text-ink-900 text-xs font-medium uppercase px-3 py-1.5 transition-colors"
            >
              No
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
            title="Elimina"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Contabilità: quarter accordion ────────────────────────────────────────────

function QuarterAccordion({
  label,
  docs,
  onDelete,
}: {
  label: string
  docs: AccountingDoc[]
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full text-left px-6 py-3 hover:bg-[#f9f9f9] transition-colors group"
      >
        <span className="text-sm font-semibold text-ink-900 group-hover:text-forest transition-colors flex-1">{label}</span>
        <span className="text-xs text-ink-400">{docs.length}</span>
        <svg
          className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {docs.map(doc => (
            <AccountingDocRow key={doc.id} doc={doc} onDelete={() => onDelete(doc.id)} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Contabilità section ───────────────────────────────────────────────────────

function ContabilitaSection({ userEmail }: { userEmail: string }) {
  const [docs, setDocs]         = useState<AccountingDoc[]>([])
  const [loading, setLoading]   = useState(true)
  const [open, setOpen]         = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    createClient()
      .from('accounting_documents')
      .select('*')
      .order('year', { ascending: false })
      .then(({ data }) => { setDocs((data ?? []) as AccountingDoc[]); setLoading(false) })
  }, [])

  function handleDelete(id: string) {
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  // Group by quarter label, sorted year DESC then quarter DESC
  const groups: { label: string; docs: AccountingDoc[] }[] = []
  const seen = new Set<string>()
  const sorted = [...docs].sort((a, b) => b.year !== a.year ? b.year - a.year : b.quarter.localeCompare(a.quarter))
  for (const doc of sorted) {
    const label = `${doc.quarter} ${doc.year}`
    if (!seen.has(label)) { seen.add(label); groups.push({ label, docs: [] }) }
    groups.find(g => g.label === label)!.docs.push(doc)
  }

  return (
    <div className="border-t border-line">
      {/* Header */}
      <div className="flex items-center gap-4 py-4">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="flex items-center gap-3 flex-1 text-left group"
        >
          <h3 className="font-serif text-xl text-ink-900 group-hover:text-forest transition-colors">Contabilità</h3>
          <span className="text-xs text-ink-400">{docs.length}</span>
          <svg
            className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
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
          <div className="bg-white border border-line-faint mb-4">
            {/* Drive link */}
            <div className="px-6 py-4 border-b border-black/5">
              <a
                href={ACCOUNTING_DRIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase tracking-wide px-4 py-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Apri cartella Drive →
              </a>
            </div>

            {/* Quarter groups */}
            {loading ? (
              <div className="px-6 py-6 text-sm text-ink-400">Caricamento...</div>
            ) : groups.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-ink-500">Nessun documento ancora.</div>
            ) : (
              groups.map(g => (
                <QuarterAccordion key={g.label} label={g.label} docs={g.docs} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <AccountingUploadModal
          userEmail={userEmail}
          onSave={doc => { setDocs(prev => [doc, ...prev]); setModalOpen(false) }}
          onClose={() => setModalOpen(false)}
        />
      )}
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
        <ContabilitaSection userEmail={userEmail} />
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
