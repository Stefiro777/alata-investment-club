'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  immagine_url: string | null
  foto_url: string | null
  photos: string[] | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getPhotos(item: Contenuto): string[] {
  if (item.photos && (item.photos as unknown[]).length > 0) return item.photos as string[]
  if (item.immagine_url) return [item.immagine_url]
  if (item.foto_url) return [item.foto_url]
  return []
}

// ── Gallery modal ────────────────────────────────────────────────────────────

function GalleryModal({
  photos,
  title,
  onClose,
}: {
  photos: string[]
  title: string
  onClose: () => void
}) {
  const [idx, setIdx] = useState(0)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIdx(i => Math.min(photos.length - 1, i + 1)), [photos.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev_overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev_overflow
    }
  }, [prev, next])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-white/60 text-sm font-serif truncate max-w-md">{title}</p>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-xs tracking-widest uppercase transition-colors"
        >
          Close ✕
        </button>
      </div>

      {/* Main photo */}
      <div
        className="flex-1 flex items-center justify-center relative px-14 min-h-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative w-full h-full max-w-5xl">
          <Image src={photos[idx]} alt="" fill className="object-contain" />
        </div>

        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white text-2xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
        )}
        {idx < photos.length - 1 && (
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-white text-2xl bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div
          className="flex-shrink-0 flex gap-2 px-6 py-4 justify-center overflow-x-auto"
          onClick={e => e.stopPropagation()}
        >
          {photos.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-14 h-14 relative overflow-hidden border-2 transition-all ${
                i === idx ? 'border-white opacity-100' : 'border-transparent opacity-40 hover:opacity-70'
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Counter */}
      <div className="pb-4 text-center flex-shrink-0" onClick={e => e.stopPropagation()}>
        <span className="text-white/30 text-xs tracking-widest">
          {idx + 1} / {photos.length}
        </span>
      </div>
    </div>
  )
}

// ── Detail modal ─────────────────────────────────────────────────────────────

function EventDetailModal({
  item,
  onClose,
}: {
  item: Contenuto
  onClose: () => void
}) {
  const photos = getPhotos(item)
  const coverPhoto = photos[0] ?? null
  const fullText = item.full_description || item.descrizione
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-[#6b7280] hover:text-[#0a0a0a] transition-colors text-lg"
          aria-label="Chiudi"
        >
          ✕
        </button>

        {/* Cover photo — object-contain so the full image is always visible */}
        {coverPhoto && (
          <div className="relative w-full flex items-center justify-center bg-[#111]" style={{ maxHeight: '320px', minHeight: '200px', height: '320px' }}>
            <Image
              src={coverPhoto}
              alt={item.titolo}
              fill
              className="object-contain"
              style={{ imageOrientation: 'from-image' } as React.CSSProperties}
            />
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {item.data_pubblicazione && (
              <span className="text-[#6b7280] text-xs tracking-widest uppercase">
                {formatDate(item.data_pubblicazione)}
              </span>
            )}
            {item.tag && (
              <span className="text-xs px-2.5 py-0.5 bg-[#1a4a3a] text-white tracking-wide">
                {item.tag}
              </span>
            )}
          </div>

          <h2 className="font-serif text-2xl font-bold text-[#0a0a0a] mb-6 leading-snug">
            {item.titolo}
          </h2>

          {fullText && (
            <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-line">
              {fullText}
            </p>
          )}

          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-6 text-[#1a4a3a] text-xs font-medium tracking-wide uppercase hover:gap-3 transition-all duration-150"
            >
              Read on LinkedIn
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Event card ───────────────────────────────────────────────────────────────

function EventCard({
  item,
  onOpenGallery,
  onOpenDetail,
}: {
  item: Contenuto
  onOpenGallery: (item: Contenuto) => void
  onOpenDetail: (item: Contenuto) => void
}) {
  const photos = getPhotos(item)
  const coverPhoto = photos[0] ?? null
  const hasGallery = photos.length > 1
  const hasText = !!(item.full_description || item.descrizione)

  return (
    <article className="group flex flex-col border border-black/10 hover:border-[#1a4a3a] transition-colors duration-150 overflow-hidden">
      {/* Photo area */}
      <div
        className={`relative h-64 bg-[#f5f5f5] overflow-hidden ${hasGallery ? 'cursor-pointer' : ''}`}
        onClick={hasGallery ? () => onOpenGallery(item) : undefined}
      >
        {coverPhoto ? (
          <>
            <Image
              src={coverPhoto}
              alt={item.titolo}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              style={{ objectPosition: 'center top', imageOrientation: 'from-image' } as React.CSSProperties}
            />
            {/* Inset border overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px white' }} />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a4a3a]/5">
            <svg className="w-10 h-10 text-[#1a4a3a]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Photo count badge */}
        {hasGallery && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-0.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {photos.length}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-3">
          {item.data_pubblicazione ? (
            <span className="text-[#6b7280] text-xs tracking-widest uppercase">
              {formatDate(item.data_pubblicazione)}
            </span>
          ) : <span />}
          {item.tag && (
            <span className="shrink-0 text-xs px-2.5 py-0.5 bg-[#1a4a3a] text-white tracking-wide">
              {item.tag}
            </span>
          )}
        </div>

        <h3 className="font-serif text-lg font-medium text-[#0a0a0a] leading-snug mb-3 group-hover:text-[#1a4a3a] transition-colors flex-1">
          {item.titolo}
        </h3>

        {(item.short_description || item.descrizione) && (
          <p className="text-[#6b7280] text-sm leading-relaxed mb-4">
            {item.short_description ?? item.descrizione}
          </p>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-black/5 mt-auto">
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#6b7280] text-xs font-medium tracking-wide uppercase hover:text-[#1a4a3a] transition-colors duration-150"
              onClick={e => e.stopPropagation()}
            >
              LinkedIn
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          )}
          <div className="flex items-center gap-3 ml-auto">
            {hasGallery && (
              <button
                onClick={() => onOpenGallery(item)}
                className="inline-flex items-center gap-1.5 text-[#6b7280] text-xs font-medium tracking-wide uppercase hover:text-[#1a4a3a] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Gallery
              </button>
            )}
            {(hasText || coverPhoto) && (
              <button
                onClick={() => onOpenDetail(item)}
                className="inline-flex items-center gap-1.5 text-[#1a4a3a] text-xs font-medium tracking-wide uppercase hover:gap-3 transition-all duration-150"
              >
                Read more
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

// ── Grid ─────────────────────────────────────────────────────────────────────

const TAG_FILTERS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Aperitifs', value: 'Aperitif' },
  { label: 'Event', value: 'Event' },
  { label: 'Team Building', value: 'Team Building' },
  { label: 'Career Talk', value: 'Career Talk' },
]

export default function EventsGrid({ items }: { items: Contenuto[] }) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [galleryItem, setGalleryItem] = useState<Contenuto | null>(null)
  const [detailItem, setDetailItem] = useState<Contenuto | null>(null)
  const closeGallery = useCallback(() => setGalleryItem(null), [])
  const closeDetail = useCallback(() => setDetailItem(null), [])

  const filtered = items.filter(item => {
    if (activeTag && item.tag !== activeTag) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      item.titolo.toLowerCase().includes(q) ||
      (item.short_description ?? '').toLowerCase().includes(q) ||
      (item.tag ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Search bar */}
      <div className="mb-10 relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a4a3a]/40 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search events..."
          className="w-full pl-11 pr-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white placeholder-[#9ca3af] transition-colors"
        />
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        {TAG_FILTERS.map(({ label, value }) => {
          const active = activeTag === value
          return (
            <button
              key={label}
              onClick={() => setActiveTag(value)}
              className="px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-150"
              style={
                active
                  ? { background: '#1a4a3a', color: 'white', borderColor: '#1a4a3a' }
                  : { background: 'white', color: '#1a4a3a', borderColor: '#1a4a3a' }
              }
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Results count */}
      {!query.trim() && !activeTag && (
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-10">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      )}

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-[#6b7280]">
          <p className="text-sm tracking-wide">No events found.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(item => (
            <EventCard key={item.id} item={item} onOpenGallery={setGalleryItem} onOpenDetail={setDetailItem} />
          ))}
        </div>
      )}

      {/* Gallery modal */}
      {galleryItem && (
        <GalleryModal
          photos={getPhotos(galleryItem)}
          title={galleryItem.titolo}
          onClose={closeGallery}
        />
      )}

      {/* Detail modal */}
      {detailItem && (
        <EventDetailModal item={detailItem} onClose={closeDetail} />
      )}
    </div>
  )
}
