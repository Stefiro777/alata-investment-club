'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Image from 'next/image'
import Reveal from '../components/Reveal'

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
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center text-ink-500 hover:text-ink-900 transition-colors text-lg"
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
              <span className="text-ink-500 text-xs tracking-widest uppercase">
                {formatDate(item.data_pubblicazione)}
              </span>
            )}
            {item.tag && (
              <span className="text-xs px-2.5 py-0.5 bg-forest text-white tracking-wide">
                {item.tag}
              </span>
            )}
          </div>

          <h2 className="font-serif text-2xl font-bold text-ink-900 mb-6 leading-snug">
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
              className="inline-flex items-center gap-1.5 mt-6 text-forest text-xs font-medium tracking-wide uppercase hover:gap-3 transition-all duration-150"
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
    <article className="group flex flex-col h-full border border-line-faint border-l-4 border-l-[#1a4a3a] hover:border-forest overflow-hidden transition-all duration-base hover:-translate-y-1 hover:shadow-lg" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Photo area */}
      <div
        className={`relative h-64 bg-paper-stone overflow-hidden ${hasGallery ? 'cursor-pointer' : ''}`}
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
            <svg className="w-10 h-10 text-forest/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <span className="text-ink-500 text-xs tracking-widest uppercase">
              {formatDate(item.data_pubblicazione)}
            </span>
          ) : <span />}
          {item.tag && (
            <span className="shrink-0 text-xs px-2.5 py-0.5 bg-forest text-white tracking-wide">
              {item.tag}
            </span>
          )}
        </div>

        <h3 className="font-serif text-lg font-medium text-ink-900 leading-snug mb-3 group-hover:text-forest transition-colors flex-1">
          {item.titolo}
        </h3>

        {(item.short_description || item.descrizione) && (
          <p className="text-ink-500 text-sm leading-relaxed mb-4">
            {item.short_description ?? item.descrizione}
          </p>
        )}

        <div className="flex items-center gap-4 pt-4 mt-auto" style={{ borderTop: '3px solid #1a4a3a' }}>
          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink-500 text-xs font-medium tracking-wide uppercase hover:text-forest transition-colors duration-fast"
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
                className="inline-flex items-center gap-1.5 text-ink-500 text-xs font-medium tracking-wide uppercase hover:text-forest transition-colors"
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
                className="inline-flex items-center gap-1.5 text-forest text-xs font-medium tracking-wide uppercase relative after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-0 after:bg-forest hover:after:w-full after:transition-all after:duration-300 hover:gap-3 transition-all duration-150"
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

const CARDS_PER_PAGE = 6

export default function EventsGrid({ items }: { items: Contenuto[] }) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [galleryItem, setGalleryItem] = useState<Contenuto | null>(null)
  const [detailItem, setDetailItem] = useState<Contenuto | null>(null)
  const [page, setPage] = useState(0)
  const [fading, setFading] = useState(false)
  const closeGallery = useCallback(() => setGalleryItem(null), [])
  const closeDetail = useCallback(() => setDetailItem(null), [])

  const filtered = useMemo(() => items.filter(item => {
    if (activeTag && item.tag !== activeTag) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      item.titolo.toLowerCase().includes(q) ||
      (item.short_description ?? '').toLowerCase().includes(q) ||
      (item.tag ?? '').toLowerCase().includes(q)
    )
  }), [items, query, activeTag])

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const currentCards = filtered.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE)

  const visibleDots = useMemo(() => {
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i)
    const start = Math.max(0, Math.min(safePage - 1, totalPages - 3))
    return [start, start + 1, start + 2]
  }, [totalPages, safePage])

  function goTo(p: number) {
    const target = Math.max(0, Math.min(totalPages - 1, p))
    if (target === safePage) return
    setFading(true)
    setTimeout(() => {
      setPage(target)
      setFading(false)
    }, 220)
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setPage(0)
  }

  function handleTag(value: string | null) {
    setFading(true)
    setTimeout(() => {
      setActiveTag(value)
      setPage(0)
      setFading(false)
    }, 220)
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-10 max-w-md">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={handleSearch}
          placeholder="Search events…"
          className="w-full pl-10 pr-4 py-3 border border-line-faint focus:outline-none focus:border-forest text-sm text-ink-900 placeholder-[#6b7280] bg-white transition-colors"
        />
      </div>

      {/* Tag filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        {TAG_FILTERS.map(({ label, value }) => {
          const active = activeTag === value
          return (
            <button
              key={label}
              onClick={() => handleTag(value)}
              className="px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-fast"
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
        <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-10">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      )}

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-ink-500">
          <p className="text-sm tracking-wide">No events found.</p>
        </div>
      ) : (
        <>
          <div
            className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-8 transition-opacity ease-in-out duration-[220ms] ${fading ? 'opacity-0' : 'opacity-100'}`}
          >
            {currentCards.map((item, i) => (
              <Reveal key={item.id} delay={Math.min(i * 80, 400)} direction="up" className="h-full">
                <EventCard item={item} onOpenGallery={setGalleryItem} onOpenDetail={setDetailItem} />
              </Reveal>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {/* Prev */}
              <button
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 0}
                className="w-9 h-9 flex items-center justify-center border border-black/15 hover:border-forest hover:text-forest disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Dots — sliding window of 3 */}
              {visibleDots.map((i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Page ${i + 1}`}
                  className={`rounded-full transition-all duration-base ${
                    i === safePage
                      ? 'w-2.5 h-2.5 bg-forest'
                      : 'w-2 h-2 bg-transparent border border-forest/40 hover:border-forest/70'
                  }`}
                />
              ))}

              {/* Next */}
              <button
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages - 1}
                className="w-9 h-9 flex items-center justify-center border border-black/15 hover:border-forest hover:text-forest disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label="Next"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
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
