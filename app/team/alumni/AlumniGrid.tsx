'use client'

import { useState } from 'react'

type Alumni = {
  id: string
  name: string
  role: string
  graduation_year: string | null
  linkedin_url: string | null
  current_company: string | null
  order_index?: number | null
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="20" rx="3" fill="white"/>
      <path d="M5.5 8H7.5V14.5H5.5V8ZM6.5 7C5.84 7 5.5 6.56 5.5 6C5.5 5.44 5.85 5 6.51 5C7.17 5 7.5 5.44 7.5 6C7.5 6.56 7.16 7 6.5 7ZM14.5 14.5H12.5V11C12.5 10.17 12.19 9.62 11.47 9.62C10.92 9.62 10.6 10 10.44 10.36C10.38 10.51 10.37 10.72 10.37 10.93V14.5H8.37V8H10.37V8.89C10.66 8.43 11.18 7.78 12.37 7.78C13.85 7.78 14.5 8.78 14.5 10.35V14.5Z" fill="#1a4a3a"/>
    </svg>
  )
}

function AlumniCard({ alumni }: { alumni: Alumni }) {
  return (
    <div
      className="bg-white overflow-hidden flex flex-col"
      style={{ border: '1px solid #1a4a3a' }}
    >
      <div className="p-4 bg-[#1a4a3a] flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-serif text-base font-bold text-white leading-tight">{alumni.name}</h3>
            <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{alumni.role}</p>
            {alumni.current_company && (
              <p className="text-sm font-semibold text-white mt-2 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0H5m14 0H5m0 0H3" />
                </svg>
                {alumni.current_company}
              </p>
            )}
            {alumni.graduation_year && (
              <p className="text-xs text-white/50 mt-1">Class of {alumni.graduation_year}</p>
            )}
          </div>
          {alumni.linkedin_url && (
            <a
              href={alumni.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 opacity-100 hover:opacity-70 transition-opacity mt-0.5"
              aria-label={`${alumni.name} on LinkedIn`}
            >
              <LinkedInIcon />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AlumniGrid({ alumni }: { alumni: Alumni[] }) {
  const [selected, setSelected] = useState<string>('')

  const sorted = [...alumni].sort((a, b) => {
    const ai = a.order_index ?? null
    const bi = b.order_index ?? null
    if (ai === null && bi === null) return 0
    if (ai === null) return 1
    if (bi === null) return -1
    return ai - bi
  })

  const companies = Array.from(
    new Set(sorted.map(a => a.current_company).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b))

  const filtered = selected
    ? sorted.filter(a => a.current_company === selected)
    : sorted

  return (
    <div>
      {/* Filter bar */}
      {companies.length > 0 && (
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          <div className="relative">
            <select
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 border border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] cursor-pointer"
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a4a3a]"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {selected && (
            <button
              onClick={() => setSelected('')}
              className="flex items-center gap-1.5 text-xs font-medium text-[#1a4a3a] border border-[#1a4a3a] px-3 py-2.5 hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Tutti
            </button>
          )}

          {selected && (
            <span className="text-xs text-[#9ca3af]">
              {filtered.length} {filtered.length === 1 ? 'alumni' : 'alumni'}
            </span>
          )}
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-[#6b7280] text-sm text-center py-8">
          Nessun alumni per questa azienda.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(a => (
            <AlumniCard key={a.id} alumni={a} />
          ))}
        </div>
      )}
    </div>
  )
}
