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

// ── Media item row in modal ────────────────────────────────────────────────────

function MediaRow({
  item,
  index,
  bucket,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  item: MediaItem
  index: number
  bucket: string
  onUpdate: (i: number, updated: MediaItem) => void
  onRemove: (i: number) => void
  onMoveUp: (i: number) => void
  onMoveDown: (i: number) => void
  isFirst: boolean
  isLast: boolean
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const result = await uploadImage(file, bucket)
    if ('error' in result) { alert(result.error); setUploading(false); return }
    onUpdate(index, { ...item, type: 'image', url: result.url })
    setUploading(false)
  }

  return (
    <div className="border border-[#e5e5e5] p-4 space-y-3 bg-[#fafafa]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#6b7280] uppercase tracking-wide">#{index + 1}</span>
        <div className="flex items-center gap-1">
          {!isFirst && (
            <button type="button" onClick={() => onMoveUp(index)} className="p-1 text-[#6b7280] hover:text-[#0a0a0a]" title="Move up">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {!isLast && (
            <button type="button" onClick={() => onMoveDown(index)} className="p-1 text-[#6b7280] hover:text-[#0a0a0a]" title="Move down">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button type="button" onClick={() => onRemove(index)} className="p-1 text-red-400 hover:text-red-600" title="Remove">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onUpdate(index, { ...item, type: 'image' })}
          className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 border transition-colors ${item.type === 'image' ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]' : 'border-[#e5e5e5] text-[#6b7280] hover:border-[#1a4a3a]'}`}
        >
          Image
        </button>
        <button
          type="button"
          onClick={() => onUpdate(index, { ...item, type: 'video' })}
          className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 border transition-colors ${item.type === 'video' ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]' : 'border-[#e5e5e5] text-[#6b7280] hover:border-[#1a4a3a]'}`}
        >
          Video URL
        </button>
      </div>

      {/* URL / upload */}
      {item.type === 'image' ? (
        <div className="flex gap-2 items-start">
          <input
            value={item.url}
            onChange={e => onUpdate(index, { ...item, url: e.target.value })}
            placeholder="Image URL"
            className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-2 transition-colors disabled:opacity-50"
          >
            {uploading ? '…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
      ) : (
        <input
          value={item.url}
          onChange={e => onUpdate(index, { ...item, url: e.target.value })}
          placeholder="YouTube or Vimeo URL"
          className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
        />
      )}

      {/* Caption */}
      <input
        value={item.caption ?? ''}
        onChange={e => onUpdate(index, { ...item, caption: e.target.value || undefined })}
        placeholder="Caption (optional)"
        className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
      />
    </div>
  )
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
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [authors, setAuthors] = useState(initial?.authors ?? '')
  const [media, setMedia] = useState<MediaItem[]>(initial?.media ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addMedia() {
    setMedia(prev => [...prev, { type: 'image', url: '' }])
  }

  function updateMedia(i: number, updated: MediaItem) {
    setMedia(prev => prev.map((m, idx) => idx === i ? updated : m))
  }

  function removeMedia(i: number) {
    setMedia(prev => prev.filter((_, idx) => idx !== i))
  }

  function moveUp(i: number) {
    if (i === 0) return
    setMedia(prev => { const a = [...prev]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a })
  }

  function moveDown(i: number) {
    setMedia(prev => { if (i >= prev.length - 1) return prev; const a = [...prev]; [a[i], a[i + 1]] = [a[i + 1], a[i]]; return a })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setSaving(true)
    setError(null)
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
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#e5e5e5]">
          <h3 className="font-serif text-xl font-bold text-[#0a0a0a]">
            {initial ? 'Edit Item' : 'Add Item'}
          </h3>
          <button onClick={onClose} className="text-[#6b7280] hover:text-[#0a0a0a] p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Title"
              className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Description *</label>
            <textarea required rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Description…"
              className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium tracking-wide uppercase text-[#6b7280] mb-2">Authors / Credits</label>
            <input value={authors} onChange={e => setAuthors(e.target.value)} placeholder="es. Mario Rossi"
              className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white" />
          </div>

          {/* Media */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium tracking-wide uppercase text-[#6b7280]">Media Gallery</label>
              <button type="button" onClick={addMedia}
                className="inline-flex items-center gap-1 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-1.5 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Media
              </button>
            </div>
            {media.length === 0 ? (
              <p className="text-xs text-[#9ca3af] py-4 text-center border border-dashed border-[#e5e5e5]">
                No media yet — add an image or video above.
              </p>
            ) : (
              <div className="space-y-3">
                {media.map((m, i) => (
                  <MediaRow
                    key={i}
                    item={m}
                    index={i}
                    bucket={bucket}
                    onUpdate={updateMedia}
                    onRemove={removeMedia}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    isFirst={i === 0}
                    isLast={i === media.length - 1}
                  />
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button type="submit" disabled={saving}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Item'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-[#6b7280] hover:text-[#0a0a0a]">Cancel</button>
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
        <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">{heading}</h2>
        <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
        <p className="text-xs text-[#6b7280] mt-3">{description}</p>
      </div>

      <button
        onClick={() => { setEditing(null); setModalOpen(true) }}
        className="mb-6 inline-flex items-center gap-2 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide uppercase px-6 py-2.5 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Item
      </button>

      {list.length === 0 ? (
        <div className="bg-white border border-black/10 px-6 py-12 text-center text-sm text-[#6b7280]">
          No items yet. Add one above.
        </div>
      ) : (
        <div className="bg-white border border-black/10">
          {list.map((item, i) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(i)}
              className="flex items-center gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors"
            >
              <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[#d1d5db] hover:text-[#9ca3af] touch-none">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-16a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0a0a0a] truncate">{item.title}</p>
                <p className="text-xs text-[#6b7280] truncate mt-0.5">{item.description}</p>
                <p className="text-xs text-[#9ca3af] mt-0.5">{(item.media ?? []).length} media item(s)</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { setEditing(item); setModalOpen(true) }}
                  className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors"
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
