'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const FOLDERS = [
  { key: 'bilanci',   label: 'Bilanci' },
  { key: 'fatture',   label: 'Fatture' },
  { key: 'contratti', label: 'Contratti' },
  { key: 'altro',     label: 'Altro' },
] as const

type FolderKey = typeof FOLDERS[number]['key']

type DocFile = {
  name: string
  path: string
  size: number
  created_at: string | null
  url: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(raw: string | null) {
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('it-IT')
}

// ── Folder accordion ──────────────────────────────────────────────────────────

function FolderSection({ folderKey, label }: { folderKey: FolderKey; label: string }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<DocFile[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const loaded = useRef(false)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finance/documents?folder=${folderKey}`)
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Errore'); setLoading(false); return }
      setFiles(json.files)
    } catch (e) {
      setError(String(e))
    }
    setLoading(false)
  }, [folderKey])

  function handleToggle() {
    const next = !open
    setOpen(next)
    if (next && !loaded.current) {
      loaded.current = true
      loadFiles()
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', folderKey)
    try {
      const res = await fetch('/api/finance/documents', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Upload fallito'); setUploading(false); return }
      await loadFiles()
    } catch (e) {
      setError(String(e))
    }
    setUploading(false)
  }

  async function handleDelete(path: string) {
    if (!confirm('Eliminare questo file?')) return
    setDeletingPath(path)
    try {
      const res = await fetch(`/api/finance/documents?path=${encodeURIComponent(path)}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Errore'); setDeletingPath(null); return }
      setFiles(prev => prev.filter(f => f.path !== path))
    } catch (e) {
      setError(String(e))
    }
    setDeletingPath(null)
  }

  return (
    <div className="border border-line mb-3">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#f9f9f9] transition-colors"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-forest flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="font-['Inter'] font-semibold text-sm text-[#1a1a1a]">{label}</span>
          {!loading && open && (
            <span className="text-xs text-ink-400">({files.length})</span>
          )}
        </div>
        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span>Uploading…</span>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload
              </>
            )}
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          <svg
            className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-line">
          {error && (
            <p className="text-xs text-red-600 border-l-2 border-red-400 pl-3 py-2 mx-6 my-3">{error}</p>
          )}
          {loading ? (
            <p className="text-xs text-ink-400 px-6 py-5">Caricamento…</p>
          ) : files.length === 0 ? (
            <p className="text-xs text-ink-400 px-6 py-5 text-center">Nessun file in questa cartella.</p>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_80px_110px_auto] gap-4 px-6 py-2 bg-[#f9f9f9] border-b border-line">
                <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Nome</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Dimensione</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Data</span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Azioni</span>
              </div>
              {files.map(f => (
                <div
                  key={f.path}
                  className="grid grid-cols-[1fr_80px_110px_auto] gap-4 px-6 py-3 border-b border-line last:border-b-0 items-center hover:bg-paper-cool transition-colors"
                >
                  <span className="text-sm text-[#1a1a1a] truncate font-['Inter']">{f.name}</span>
                  <span className="text-xs text-ink-500 font-['Inter']">{formatSize(f.size)}</span>
                  <span className="text-xs text-ink-500 font-['Inter']">{formatDate(f.created_at)}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={f.name}
                      className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.path)}
                      disabled={deletingPath === f.path}
                      className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors disabled:opacity-40"
                    >
                      {deletingPath === f.path ? '…' : 'Elimina'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FinanceDocuments() {
  return (
    <div>
      <p className="text-xs text-ink-500 font-['Inter'] mb-6">
        Documenti contabili interni — PDF, Excel, DOCX. Visibile solo agli admin.
      </p>
      {FOLDERS.map(f => (
        <FolderSection key={f.key} folderKey={f.key} label={f.label} />
      ))}
    </div>
  )
}
