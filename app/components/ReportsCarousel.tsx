'use client'

import { useState, useMemo } from 'react'

type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
}

function cleanLine(line: string): string {
  return line
    .replace(/\r/g, '')
    .replace(/@\[([^\]]+)\]\(urn:[^)]*\)/g, '$1')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/urn:li:\S*/g, '')
    .replace(/#\S+/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[^\x20-\x7E\xA0-\u017E]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function getTitle(text: string): string {
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const cleaned = cleanLine(line)
    if (cleaned.length > 0) return cleaned
  }
  return ''
}

function getPreview(text: string): string | null {
  const lines = text.split(/\r?\n/)
  let pastTitle = false
  const bodyLines: string[] = []

  for (const line of lines) {
    const cleaned = cleanLine(line)
    if (!pastTitle) {
      if (cleaned.length > 0) pastTitle = true
      continue
    }
    if (/^Credits:/i.test(cleaned)) continue
    bodyLines.push(cleaned)
  }

  const body = bodyLines.join(' ').replace(/\s+/g, ' ').trim()
  if (!body) return null
  return body.length > 120 ? body.slice(0, 120).trimEnd() + '...' : body
}

function getLinkedInUrl(link: string): string {
  if (link.startsWith('urn:')) {
    return `https://www.linkedin.com/feed/update/${link}/`
  }
  return link
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function ReportCard({ item }: { item: Contenuto }) {
  const title = getTitle(item.titolo)
  const preview = getPreview(item.descrizione ?? item.titolo)

  return (
    <article className="flex flex-col bg-white border border-black/10 hover:border-black/25 hover:shadow-md transition-all duration-200 p-6 h-full">
      {item.data_pubblicazione && (
        <span className="text-[#6b7280] text-xs tracking-widest uppercase mb-3">
          {formatDate(item.data_pubblicazione)}
        </span>
      )}
      <h3 className="font-serif text-xl font-bold text-[#0a0a0a] leading-snug mb-3">
        {title}
      </h3>
      {preview && (
        <p className="text-[#6b7280] text-sm leading-relaxed flex-1">
          {preview}
        </p>
      )}
      <div className="mt-4 pt-4 border-t border-black/5">
        {item.link ? (
          <a
            href={getLinkedInUrl(item.link)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 border border-[#1a4a3a] text-[#1a4a3a] bg-transparent hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150"
          >
            Read on LinkedIn
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        ) : null}
      </div>
    </article>
  )
}

const CARDS_PER_PAGE = 3

export default function ReportsCarousel({ reports }: { reports: Contenuto[] }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return reports
    return reports.filter((item) => {
      const t = getTitle(item.titolo).toLowerCase()
      const d = item.descrizione ? getTitle(item.descrizione).toLowerCase() : ''
      return t.includes(q) || d.includes(q)
    })
  }, [reports, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE))
  const safePage = Math.min(page, totalPages - 1)
  const currentCards = filtered.slice(safePage * CARDS_PER_PAGE, (safePage + 1) * CARDS_PER_PAGE)

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setPage(0)
  }

  function goTo(p: number) {
    setPage(Math.max(0, Math.min(totalPages - 1, p)))
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-10 max-w-md">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={handleSearch}
          placeholder="Search reports…"
          className="w-full pl-10 pr-4 py-3 border border-black/10 focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] placeholder-[#6b7280] bg-white transition-colors"
        />
      </div>

      {/* No results */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-[#6b7280]">
          <p className="text-sm tracking-wide">No results found.</p>
        </div>
      ) : (
        <>
          {/* Cards grid */}
          <div
            key={`${safePage}-${search}`}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 animate-card-enter"
          >
            {currentCards.map((item) => (
              <ReportCard key={item.id} item={item} />
            ))}
          </div>

          {/* Navigation */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              {/* Prev */}
              <button
                onClick={() => goTo(safePage - 1)}
                disabled={safePage === 0}
                className="w-9 h-9 flex items-center justify-center border border-black/15 hover:border-[#1a4a3a] hover:text-[#1a4a3a] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Dots */}
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Page ${i + 1}`}
                  className={`rounded-full transition-all duration-200 ${
                    i === safePage
                      ? 'w-6 h-2 bg-[#1a4a3a]'
                      : 'w-2 h-2 bg-black/20 hover:bg-black/40'
                  }`}
                />
              ))}

              {/* Next */}
              <button
                onClick={() => goTo(safePage + 1)}
                disabled={safePage === totalPages - 1}
                className="w-9 h-9 flex items-center justify-center border border-black/15 hover:border-[#1a4a3a] hover:text-[#1a4a3a] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
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
    </div>
  )
}
