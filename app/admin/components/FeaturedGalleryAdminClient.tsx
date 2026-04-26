'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { FeaturedGalleryItem, MediaItem } from '@/lib/types'

// ── Upload helper ──────────────────────────────────────────────────────────────

async function uploadImage(file: File, bucket: string): Promise<{ url: string } | { error: string }> {
  const form = new FormData()
  form.append('file', file)
  form.append('bucket', bucket)
  const res = await fetch('/api/featured-gallery/upload', { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok) return { error: json.error ?? 'Upload failed' }
  return { url: json.url }
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function GalleryModal({
  initial,
  table,
  bucket,
  onSave,
  onClose,
}: {
  initial?: FeaturedGalleryItem
  table: string
  bucket: string
  onSave: (item: FeaturedGalleryItem) => void
  onClose: () => void
}) {
  const existingImages = (initial?.media ?? []).filter(m => m.type === 'image').map(m => m.url)
  const existingVideo = (initial?.media ?? []).find(m => m.type === 'video')

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [authors, setAuthors] = useState(initial?.authors ?? '')
  const [images, setImages] = useState<string[]>(existingImages)
  const [videoUrl, setVideoUrl] = useState(existingVideo?.url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError(null)
    const results = await Promise.all(files.map(f => uploadImage(f, bucket)))
    const errors = results.filter((r): r is { error: string } => 'error' in r)
    if (errors.length) setError(errors.map(r => r.error).join(', '))
    const urls = results.filter((r): r is { url: string } => 'url' in r).map(r => r.url)
    setImages(prev => [...prev, ...urls])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSaving(true)
    setError(null)

    const media: MediaItem[] = [
      ...images.map(url => ({ type: 'image' as const, url })),
      ...(videoUrl.trim() ? [{ type: 'video' as const, url: videoUrl.trim() }] : []),
    ]

    const supabase = createClient()
    const payload = {
      title: title.trim(),
      description: description.trim(),
      authors: authors.trim() || null,
      media,
    }

    if (initial) {
      const { data, error: err } = await supabase
        .from(table)
        .update(payload)
        .eq('id', initial.id)
        .select('id, title, description, authors, media, display_order')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as FeaturedGalleryItem)
    } else {
      const { data, error: err } = await supabase
        .from(table)
        .insert({ ...payload, display_order: 999 })
        .select('id, title, description, authors, media, display_order')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as FeaturedGalleryItem)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-line">
          <h3 className="font-serif text-xl font-bold text-ink-900">
            {initial ? 'Edit Item' : 'Add Item'}
          </h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">Description *</label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description…"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">Authors / Credits</label>
            <input value={authors} onChange={e => setAuthors(e.target.value)} placeholder="es. Mario Rossi"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white" />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">Photos</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border border-dashed border-forest text-forest hover:bg-[#f0f7f4] text-xs font-medium px-4 py-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                'Uploading…'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Select Photos (multiple allowed)
                </>
              )}
            </button>
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={handleFiles} />

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {images.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={url} alt="" className="w-full h-full object-cover border border-line" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && !uploading && (
              <p className="text-xs text-ink-400 mt-2 text-center">No photos yet.</p>
            )}
          </div>

          {/* Video */}
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-ink-500 mb-2">Video URL (optional)</label>
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="YouTube or Vimeo URL"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white"
            />
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving || uploading}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Item'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main client ────────────────────────────────────────────────────────────────

export default function FeaturedGalleryAdminClient({
  items: initialItems,
  table,
  bucket,
  heading,
  description,
}: {
  items: FeaturedGalleryItem[]
  table: string
  bucket: string
  heading: string
  description: string
}) {
  const [list, setList] = useState<FeaturedGalleryItem[]>(initialItems)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FeaturedGalleryItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const dragIndex = useRef<number | null>(null)

  function onDragStart(i: number) { dragIndex.current = i }

  async function onDrop(i: number) {
    const from = dragIndex.current
    if (from === null || from === i) { dragIndex.current = null; return }
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(i, 0, moved)
    setList(next)
    dragIndex.current = null

    try {
      await fetch(`/api/featured-gallery/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, items: next.map((r, idx) => ({ id: r.id, display_order: idx })) }),
      })
    } catch (err) { console.error('[FeaturedGallery] reorder error:', err) }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    const supabase = createClient()
    await supabase.from(table).delete().eq('id', id)
    setList(prev => prev.filter(r => r.id !== id))
    setDeletingId(null)
  }

  function handleSaved(item: FeaturedGalleryItem) {
    if (editing) setList(prev => prev.map(x => x.id === item.id ? item : x))
    else setList(prev => [...prev, item])
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-ink-900">{heading}</h2>
        <div className="w-10 h-0.5 bg-forest mt-2" />
        <p className="text-xs text-ink-500 mt-3">{description}</p>
      </div>

      <button
        onClick={() => { setEditing(null); setModalOpen(true) }}
        className="mb-6 inline-flex items-center gap-2 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide uppercase px-6 py-2.5 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Item
      </button>

      {list.length === 0 ? (
        <div className="bg-white border border-line-faint px-6 py-12 text-center text-sm text-ink-500">
          No items yet. Add one above.
        </div>
      ) : (
        <div className="bg-white border border-line-faint">
          {list.map((item, i) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="flex items-center gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors"
            >
              <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-ink-300 hover:text-ink-400 touch-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-900 truncate">{item.title}</p>
                <p className="text-xs text-ink-500 truncate mt-0.5">{item.description}</p>
                <p className="text-xs text-ink-400 mt-0.5">
                  {(item.media ?? []).filter(m => m.type === 'image').length} photo(s)
                  {(item.media ?? []).some(m => m.type === 'video') ? ' · 1 video' : ''}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { setEditing(item); setModalOpen(true) }}
                  className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.title)}
                  disabled={deletingId === item.id}
                  className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors disabled:opacity-40"
                >
                  {deletingId === item.id ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <GalleryModal
          initial={editing ?? undefined}
          table={table}
          bucket={bucket}
          onSave={handleSaved}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
