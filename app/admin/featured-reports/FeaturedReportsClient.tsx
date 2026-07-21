'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { FeaturedReport } from '@/lib/types'

// ── Storage upload helpers ──────────────────────────────────────────────────────

async function uploadFile(file: File, bucket: string): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return { url: publicUrl }
}

// ── Modal form ─────────────────────────────────────────────────────────────────

function ReportModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: FeaturedReport
  onSave: (r: FeaturedReport) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [authors, setAuthors] = useState(initial?.authors ?? '')
  const [pdfUrl, setPdfUrl] = useState(initial?.pdf_url ?? '')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pdfRef = useRef<HTMLInputElement>(null)

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingPdf(true)
    const result = await uploadFile(file, 'featured-reports')
    if ('error' in result) setError(result.error)
    else setPdfUrl(result.url)
    setUploadingPdf(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()

    if (initial) {
      const { data, error: err } = await supabase
        .from('featured_reports')
        .update({
          title: title.trim(),
          description: description.trim(),
          authors: authors.trim() || null,
          pdf_url: pdfUrl || null,
        })
        .eq('id', initial.id)
        .select('id, title, description, pdf_url, authors, display_order')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as FeaturedReport)
    } else {
      const { data, error: err } = await supabase
        .from('featured_reports')
        .insert({
          title: title.trim(),
          description: description.trim(),
          authors: authors.trim() || null,
          pdf_url: pdfUrl || null,
          display_order: 999,
        })
        .select('id, title, description, pdf_url, authors, display_order')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as FeaturedReport)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-line">
          <h3 className="font-serif text-xl font-bold text-ink-900">
            {initial ? 'Edit Featured Report' : 'Add Featured Report'}
          </h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 transition-colors -m-3.5 p-3.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Report title"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the report…"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors resize-none"
            />
          </div>

          {/* Authors */}
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
              Authors
            </label>
            <input
              value={authors}
              onChange={e => setAuthors(e.target.value)}
              placeholder="es. Mario Rossi, Luca Bianchi"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
            />
          </div>

          {/* PDF */}
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">
              PDF File
            </label>
            <div className="flex gap-3 items-start">
              <input
                value={pdfUrl}
                onChange={e => setPdfUrl(e.target.value)}
                placeholder="PDF URL or upload"
                className="flex-1 px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
              />
              <button
                type="button"
                onClick={() => pdfRef.current?.click()}
                disabled={uploadingPdf}
                className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2.5 transition-colors duration-fast disabled:opacity-50"
              >
                {uploadingPdf ? '…' : 'Upload'}
              </button>
              <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
            </div>
            {pdfUrl && (
              <p className="mt-1 text-xs text-ink-500 truncate">{pdfUrl}</p>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
          )}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors duration-fast disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Report'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900 tracking-wide transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main client ────────────────────────────────────────────────────────────────

export default function FeaturedReportsClient({ reports: initialReports }: { reports: FeaturedReport[] }) {
  const [list, setList] = useState<FeaturedReport[]>(initialReports)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FeaturedReport | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)

  function onDragStart(index: number) {
    dragIndex.current = index
  }

  async function onDrop(index: number) {
    const from = dragIndex.current
    if (from === null || from === index) { dragIndex.current = null; return }
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    setList(next)
    dragIndex.current = null

    try {
      await fetch('/api/featured-reports/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: next.map((r, i) => ({ id: r.id, display_order: i })) }),
      })
    } catch (err) {
      console.error('[FeaturedReports] reorder error:', err)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from('featured_reports').delete().eq('id', id)
    setList(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }

  function handleSaved(r: FeaturedReport) {
    if (editing) {
      setList(prev => prev.map(x => x.id === r.id ? r : x))
    } else {
      setList(prev => [...prev, r])
    }
    setModalOpen(false)
    setEditing(null)
  }

  function openAdd() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(r: FeaturedReport) {
    setEditing(r)
    setModalOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink-900">Featured Reports</h2>
        <div className="w-10 h-0.5 bg-forest mt-2" />
        <p className="text-xs text-ink-500 mt-3">
          These reports appear on the public /reports page with alternating image–text layout. Drag to reorder.
        </p>
      </div>

      <button
        onClick={openAdd}
        className="mb-6 inline-flex items-center gap-2 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide uppercase px-6 py-2.5 transition-colors duration-fast"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Featured Report
      </button>

      {list.length === 0 ? (
        <div className="bg-white border border-line-faint px-6 py-12 text-center text-sm text-ink-500">
          No featured reports yet. Add one above.
        </div>
      ) : (
        <div className="bg-white border border-line-faint">
          {list.map((report, i) => (
            <div
              key={report.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="flex items-center gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors"
            >
              {/* Drag handle */}
              <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-ink-300 hover:text-ink-400 touch-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
                </svg>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{report.title}</p>
                <p className="text-xs text-ink-500 truncate mt-0.5">{report.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  {report.pdf_url && (
                    <span className="text-xs text-forest flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      PDF attached
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(report)}
                  className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-3.5 transition-colors duration-fast"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(report.id, report.title)}
                  disabled={deletingId === report.id}
                  className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-3.5 transition-colors duration-fast disabled:opacity-40"
                >
                  {deletingId === report.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ReportModal
          initial={editing ?? undefined}
          onSave={handleSaved}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
