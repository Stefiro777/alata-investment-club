'use client'

import Image from 'next/image'
import Link from 'next/link'

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

export default function NewsCard({ item }: { item: NewsItem }) {
  const coverPhoto = item.photos?.[0] ?? item.immagine_url ?? null
  const preview = item.short_description ?? (item.descrizione ? truncate(item.descrizione, 120) : null)

  return (
      <article
        className="relative group flex flex-col h-full border border-line-faint border-l-4 border-l-forest hover:border-forest overflow-hidden cursor-pointer"
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          transition: 'transform 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 16px 40px rgba(26,74,58,0.15)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.transform = ''
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'
        }}
      >
        {/* Stretched link — covers the whole card */}
        <Link href="/events" className="absolute inset-0 z-0" aria-label={item.titolo} />
        {/* Photo */}
        {coverPhoto ? (
          <div className="relative h-64 overflow-hidden bg-paper-stone">
            <Image
              src={coverPhoto}
              alt={item.titolo}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              style={{ objectPosition: 'center top', imageOrientation: 'from-image' } as React.CSSProperties}
            />
            {/* Green tint overlay on hover */}
            <div
              className="absolute inset-0 bg-forest opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
            />
            <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: 'inset 0 0 0 3px white' }} />
          </div>
        ) : (
          <div className="h-64 bg-forest/5 flex items-center justify-center">
            <svg className="w-10 h-10 text-forest/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

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

          <h3 className="font-serif text-lg font-medium text-ink-900 leading-snug mb-3 group-hover:text-forest transition-colors duration-fast flex-1">
            {item.titolo}
          </h3>

          {preview && (
            <p className="text-ink-500 text-sm leading-relaxed mb-4">
              {preview}
            </p>
          )}

          <div className="flex items-center gap-4 pt-4 mt-auto" style={{ borderTop: '3px solid #1a4a3a' }}>
            {item.link && (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 inline-flex items-center gap-1.5 text-ink-500 text-xs font-medium tracking-wide uppercase hover:text-forest hover:gap-3 transition-all duration-150"
              >
                LinkedIn
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </article>
  )
}
