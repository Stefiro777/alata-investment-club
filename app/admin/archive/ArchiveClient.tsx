'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const PRESET_TAGS = ['Contratti', 'Bilanci', 'Sponsor', 'Legal', 'Comunicazioni', 'Altro']

type Doc = {
  id: string
  title: string
  description: string | null
  tags: string[]
  file_url: string
  file_name: string
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

// ── Tag selector ───────────────────────────────────────────────────────────────

function TagSelector({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const [custom, setCustom] = useState('')

  function toggle(tag: string) {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag))
    else onChange([...selected, tag])
  }

  function addCustom(e: React.KeyboardEvent) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const t = custom.trim()
    if (!t || selected.includes(t)) { setCustom(''); return }
    onChange([...selected, t])
    setCustom('')
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-xs px-3 py-1 border transition-colors ${selected.includes(tag) ? 'bg-forest text-white border-forest' : 'border-line text-ink-500 hover:border-forest'}`}
          >
            {tag}
          </button>
        ))}
        {/* Custom tags already added */}
        {selected.filter(t => !PRESET_TAGS.includes(t)).map(tag => (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className="text-xs px-3 py-1 border bg-[#1a4a3a]/10 text-forest border-forest/30 hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition-colors">
            {tag} ×
          </button>
        ))}
      </div>
      <input
        value={custom}
        onChange={e => setCustom(e.target.value)}
        onKeyDown={addCustom}
        placeholder="Tag personalizzato (premi Invio)"
        className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
      />
    </div>
  )
}

// ── Add document modal ─────────────────────────────────────────────────────────

function AddDocModal({
  userEmail,
  onSave,
  onClose,
}: {
  userEmail: string
  onSave: (doc: Doc) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [fileUrl, setFileUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadDoc(file)
    if ('error' in result) { setError(result.error); setUploading(false); return }
    setFileUrl(result.url)
    setFileName(result.name)
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !fileUrl) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('admin_documents')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        tags,
        file_url: fileUrl,
        file_name: fileName,
        uploaded_by: userEmail,
      })
      .select('*')
      .single()
    if (err) { setError(err.message); setSaving(false); return }
    onSave(data as Doc)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
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
          {/* File upload first */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">
              File * (PDF, DOCX, immagini)
            </label>
            <div className="flex gap-3 items-center">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-4 py-2.5 transition-colors disabled:opacity-50 whitespace-nowrap">
                {uploading ? 'Uploading…' : 'Scegli file'}
              </button>
              {fileName && <span className="text-xs text-ink-500 truncate flex-1">{fileName}</span>}
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Titolo *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo documento"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Descrizione</label>
            <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrizione…"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Tag</label>
            <TagSelector selected={tags} onChange={setTags} />
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving || !fileUrl}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Aggiungi documento'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Doc row ────────────────────────────────────────────────────────────────────

function DocRow({ doc, onDelete }: { doc: Doc; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false)

  const ext = doc.file_name.split('.').pop()?.toLowerCase() ?? ''
  const isPdf = ext === 'pdf'
  const isDoc = ['doc', 'docx'].includes(ext)

  return (
    <div className="flex items-start gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors">
      {/* Type icon */}
      <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center border ${isPdf ? 'border-red-200 bg-red-50' : isDoc ? 'border-blue-200 bg-blue-50' : 'border-line bg-paper-stone'}`}>
        <span className="text-[9px] font-bold uppercase tracking-widest">{ext}</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900">{doc.title}</p>
        {doc.description && <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{doc.description}</p>}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {doc.tags.map(tag => (
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
        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
          className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors">
          Download
        </a>
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

// ── Main client ────────────────────────────────────────────────────────────────

export default function ArchiveClient({ initialDocs, userEmail }: { initialDocs: Doc[]; userEmail: string }) {
  const [docs, setDocs] = useState<Doc[]>(initialDocs)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const allTags = Array.from(new Set(docs.flatMap(d => d.tags))).sort()
  const filtered = activeTag ? docs.filter(d => d.tags.includes(activeTag)) : docs

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('admin_documents').delete().eq('id', id)
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink-900">Archivio Documenti</h2>
        <div className="w-10 h-0.5 bg-forest mt-2" />
        <p className="text-xs text-ink-500 mt-3">Documenti interni — PDF, DOCX, immagini. Visibile solo agli admin.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide uppercase px-6 py-2.5 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload documento
        </button>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTag(null)}
              className={`text-xs px-3 py-1.5 border transition-colors ${!activeTag ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-line text-ink-500 hover:border-[#0a0a0a]'}`}
            >
              Tutti
            </button>
            {allTags.map(tag => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`text-xs px-3 py-1.5 border transition-colors ${activeTag === tag ? 'bg-forest text-white border-forest' : 'border-line text-ink-500 hover:border-forest'}`}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-line-faint px-6 py-12 text-center text-sm text-ink-500">
          {activeTag ? `Nessun documento con tag "${activeTag}".` : 'Nessun documento ancora. Carica il primo!'}
        </div>
      ) : (
        <div className="bg-white border border-line-faint">
          {filtered.map(doc => (
            <DocRow key={doc.id} doc={doc} onDelete={() => handleDelete(doc.id)} />
          ))}
        </div>
      )}

      {modalOpen && (
        <AddDocModal
          userEmail={userEmail}
          onSave={doc => { setDocs(prev => [doc, ...prev]); setModalOpen(false) }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
