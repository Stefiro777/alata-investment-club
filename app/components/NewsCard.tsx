'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

export type NewsItem = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  immagine_url: string | null
  photos: string[] | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

function DetailModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  const coverPhoto = item.photos?.[0] ?? item.immagine_url ?? null
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

        {/* Photo */}
        {coverPhoto && (
          <div className="relative h-56 w-full overflow-hidden bg-[#f5f5f5]">
            <Image
              src={coverPhoto}
              alt={item.titolo}
              fill
              className="object-cover"
              style={{ objectPosition: 'center' }}
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

          {item.descrizione && (
            <p className="text-[#374151] text-sm leading-relaxed whitespace-pre-line">
              {item.descrizione}
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

export default function NewsCard({ item }: { item: NewsItem }) {
  const [modalOpen, setModalOpen] = useState(false)
  const coverPhoto = item.photos?.[0] ?? item.immagine_url ?? null
  const preview = item.short_description ?? (item.descrizione ? truncate(item.descrizione, 120) : null)

  return (
    <>
      <article
        className="group flex flex-col border border-black/10 border-l-4 border-l-[#1a4a3a] hover:border-[#1a4a3a] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        {/* Photo */}
        {coverPhoto ? (
          <div className="relative h-64 overflow-hidden bg-[#f5f5f5]">
            <Image
              src={coverPhoto}
              alt={item.titolo}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              style={{ objectPosition: 'center top', imageOrientation: 'from-image' } as React.CSSProperties}
            />
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px white' }} />
          </div>
        ) : (
          <div className="h-64 bg-[#1a4a3a]/5 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#1a4a3a]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

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

          {preview && (
            <p className="text-[#6b7280] text-sm leading-relaxed mb-4">
              {preview}
            </p>
          )}

          <div className="flex items-center gap-4 pt-4 mt-auto" style={{ borderTop: '3px solid #1a4a3a' }}>
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
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-[#1a4a3a] text-xs font-medium tracking-wide uppercase relative after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-0 after:bg-[#1a4a3a] hover:after:w-full after:transition-all after:duration-300 hover:gap-3 transition-all duration-150 ml-auto"
            >
              Read more
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </article>

      {modalOpen && <DetailModal item={item} onClose={() => setModalOpen(false)} />}
    </>
  )
}
