'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/app/dashboard/DashboardProfileContext'

// ── Types ──────────────────────────────────────────────────────────────────────

type Venue = {
  id: string
  name: string
  address: string | null
  contact: string | null
  notes: string | null
  price_notes: string | null
  photos: string[]
  created_at: string
}

// ── Upload helper ──────────────────────────────────────────────────────────────

async function uploadVenuePhoto(file: File): Promise<{ url: string } | { error: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/venues/upload', { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok) return { error: json.error ?? 'Upload failed' }
  return { url: json.url }
}

// ── Photos editor ──────────────────────────────────────────────────────────────

function PhotosEditor({
  photos,
  onChange,
  venueId,
}: {
  photos: string[]
  onChange: (photos: string[]) => void
  venueId?: string
}) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)
    const results = await Promise.all(files.map(uploadVenuePhoto))
    const urls = results.filter((r): r is { url: string } => 'url' in r).map(r => r.url)
    onChange([...photos, ...urls])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= photos.length) return
    const next = [...photos]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
    if (venueId) {
      const supabase = createClient()
      await supabase.from('venues').update({ photos: next }).eq('id', venueId)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium tracking-wide uppercase text-ink-500">Foto</label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : '+ Aggiungi foto'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFile} />
      </div>
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div key={i} className="relative group w-20 h-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-20 h-20 object-cover border border-line" />

              {/* Arrow reorder buttons */}
              <div className="absolute bottom-0 left-0 right-0 flex opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="flex-1 text-white text-xs py-0.5 hover:bg-white/20 transition-colors disabled:opacity-30"
                  title="Sposta a sinistra"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1}
                  className="flex-1 text-white text-xs py-0.5 hover:bg-white/20 transition-colors disabled:opacity-30"
                  title="Sposta a destra"
                >
                  →
                </button>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, idx) => idx !== i))}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Venue modal ────────────────────────────────────────────────────────────────

function VenueModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Venue
  onSave: (v: Venue) => void
  onClose: () => void
}) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [address, setAddress]     = useState(initial?.address ?? '')
  const [contact, setContact]     = useState(initial?.contact ?? '')
  const [notes, setNotes]         = useState(initial?.notes ?? '')
  const [priceNotes, setPriceNotes] = useState(initial?.price_notes ?? '')
  const [photos, setPhotos]       = useState<string[]>(initial?.photos ?? [])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      contact: contact.trim() || null,
      notes: notes.trim() || null,
      price_notes: priceNotes.trim() || null,
      photos,
    }

    if (initial) {
      const { data, error: err } = await supabase
        .from('venues').update(payload).eq('id', initial.id)
        .select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Venue)
    } else {
      const { data, error: err } = await supabase
        .from('venues').insert(payload).select('*').single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Venue)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-8 py-6 border-b border-line">
          <h3 className="font-serif text-xl font-bold text-ink-900">
            {initial ? 'Modifica Venue' : 'Aggiungi Venue'}
          </h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Nome *</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nome del locale"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Indirizzo</label>
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Via Roma 1, Milano"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Contatto (tel/email)</label>
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="+39 02 123456 / info@venue.it"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Prezzo indicativo</label>
            <input
              value={priceNotes}
              onChange={e => setPriceNotes(e.target.value)}
              placeholder="es. €500 minimo consumazione"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-ink-500 mb-2">Note libere</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Note aggiuntive…"
              className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm bg-white resize-none"
            />
          </div>
          <PhotosEditor photos={photos} onChange={setPhotos} venueId={initial?.id} />

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-8 py-3 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : initial ? 'Salva modifiche' : 'Aggiungi venue'}
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

// ── Lightbox ───────────────────────────────────────────────────────────────────

function Lightbox({ photos, index, onClose }: { photos: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Chiudi"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); setCurrent(i => Math.max(0, i - 1)) }}
          disabled={current === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-20"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      <div className="relative max-w-[90vw] max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[current]}
          alt=""
          style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', display: 'block' }}
          onError={e => {
            ;(e.target as HTMLImageElement).src =
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23374151"/><text x="50%" y="50%" fill="%239ca3af" font-size="12" text-anchor="middle" dy=".3em">URL scaduto</text></svg>'
          }}
        />
        {photos.length > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-medium px-2 py-1">
            {current + 1} / {photos.length}
          </span>
        )}
      </div>

      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); setCurrent(i => Math.min(photos.length - 1, i + 1)) }}
          disabled={current === photos.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-20"
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Venue row ──────────────────────────────────────────────────────────────────

function VenueRow({
  venue,
  canEdit,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  venue: Venue
  canEdit: boolean
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [deleting, setDeleting]         = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [thumbError, setThumbError]     = useState(false)

  const hasPhotos     = Array.isArray(venue.photos) && venue.photos.length > 0
  const showPlaceholder = !hasPhotos || thumbError

  const notes        = venue.notes ?? ''
  const notesLong    = notes.length > 80
  const notesDisplay = notesLong && !isExpanded ? notes.slice(0, 80) + '…' : notes

  async function handleDelete() {
    if (!confirm(`Eliminare "${venue.name}"?`)) return
    setDeleting(true)
    onDelete()
  }

  return (
    <>
      <div className="flex items-start gap-4 px-6 py-4 border-b border-black/5 last:border-b-0 hover:bg-[#f9f9f9] transition-colors">
        {/* Thumbnail */}
        <div
          className="relative flex-shrink-0 border border-line"
          style={{ width: 120, height: 120, background: '#f5f5f5', cursor: hasPhotos && !thumbError ? 'zoom-in' : 'default' }}
          onClick={() => hasPhotos && !thumbError && setLightboxIndex(0)}
        >
          {hasPhotos && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={venue.photos[0]}
              alt=""
              style={{ width: 120, height: 120, objectFit: 'cover', display: showPlaceholder ? 'none' : 'block' }}
              onError={() => setThumbError(true)}
            />
          )}
          {showPlaceholder && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" fill="none" stroke="#d1d5db" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {hasPhotos && !thumbError && venue.photos.length > 1 && (
            <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, fontWeight: 500, padding: '2px 5px', lineHeight: 1 }}>
              +{venue.photos.length - 1}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-900">{venue.name}</p>
          {venue.address    && <p className="text-xs text-ink-500 mt-0.5">{venue.address}</p>}
          {venue.contact    && <p className="text-xs text-ink-500">{venue.contact}</p>}
          {venue.price_notes && <p className="text-xs text-forest mt-1 font-medium whitespace-pre-wrap">{venue.price_notes}</p>}
          {notes && (
            <div className="mt-1">
              <p className="text-xs text-ink-400 whitespace-pre-wrap">{notesDisplay}</p>
              {notesLong && (
                <button
                  type="button"
                  onClick={onToggle}
                  className="text-[10px] text-ink-400 hover:text-ink-700 mt-0.5 transition-colors"
                >
                  {isExpanded ? 'Chiudi ↑' : 'Leggi di più ↓'}
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] text-ink-300 mt-1">{venue.photos.length} foto</p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onEdit}
              className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium uppercase px-3 py-1.5 transition-colors disabled:opacity-40"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox photos={venue.photos} index={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </>
  )
}

// ── Main section ───────────────────────────────────────────────────────────────

export default function VenuesSection() {
  const profile = useProfile()
  const [venues, setVenues]     = useState<Venue[]>([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]   = useState<Venue | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const canEdit = profile?.role === 'bod' || profile?.role === 'director' || !!profile?.teams?.includes('events')

  useEffect(() => {
    createClient()
      .from('venues')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setVenues(data ?? []); setLoading(false) })
  }, [])

  function handleSaved(v: Venue) {
    if (editing) setVenues(prev => prev.map(x => x.id === v.id ? v : x))
    else setVenues(prev => [v, ...prev])
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from('venues').delete().eq('id', id)
    setVenues(prev => prev.filter(v => v.id !== id))
  }

  return (
    <section className="mt-12">
      <div className="border-t border-line mb-8" />
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-semibold text-ink-900">Venues</h2>
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide uppercase px-5 py-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Aggiungi venue
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Caricamento...</p>
      ) : venues.length === 0 ? (
        <p className="text-sm text-ink-500">Nessun venue ancora.</p>
      ) : (
        <div className="bg-white border border-line">
          {venues.map(v => (
            <VenueRow
              key={v.id}
              venue={v}
              canEdit={canEdit}
              isExpanded={expanded.has(v.id)}
              onToggle={() => toggleExpanded(v.id)}
              onEdit={() => { setEditing(v); setModalOpen(true) }}
              onDelete={() => handleDelete(v.id)}
            />
          ))}
        </div>
      )}

      {modalOpen && (
        <VenueModal
          initial={editing ?? undefined}
          onSave={handleSaved}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </section>
  )
}
