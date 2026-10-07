'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { Alumni } from '@/lib/types'
import Reveal from '@/app/components/Reveal'

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2)
}

export const INDUSTRY_OPTIONS = [
  'Investment Banking', 'Consulting', 'Asset Management', 'Private Equity',
  'Venture Capital', 'Hedge Fund', 'Big Tech', 'Sales & Business Development', 'Start-up', 'Audit & Accounting',
  'Tax & Legal', 'Commercial Banking', 'Private Banking', 'Wealth Management',
  'Real Estate', 'Corporate Finance', 'Research & Valuation', 'Insurance',
  'Public Sector', 'Other',
]

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="20" height="20" fill="white"/>
      <path d="M5.5 8H7.5V14.5H5.5V8ZM6.5 7C5.84 7 5.5 6.56 5.5 6C5.5 5.44 5.85 5 6.51 5C7.17 5 7.5 5.44 7.5 6C7.5 6.56 7.16 7 6.5 7ZM14.5 14.5H12.5V11C12.5 10.17 12.19 9.62 11.47 9.62C10.92 9.62 10.6 10 10.44 10.36C10.38 10.51 10.37 10.72 10.37 10.93V14.5H8.37V8H10.37V8.89C10.66 8.43 11.18 7.78 12.37 7.78C13.85 7.78 14.5 8.78 14.5 10.35V14.5Z" fill="#1a4a3a"/>
    </svg>
  )
}

function AlumniCard({ alumni }: { alumni: Alumni }) {
  return (
    <div
      className="group member-card-simple bg-white overflow-hidden flex flex-col h-full"
      style={{ border: '1px solid #1a4a3a' }}
    >
      <div className="relative p-4 bg-forest flex-grow">
        {/* Hairline that grows on hover */}
        <div className="absolute top-0 left-0 h-px bg-white/40 w-0 group-hover:w-full transition-[width] duration-slow" />
        <div className="flex items-start gap-3">
          <div className="relative w-11 h-11 shrink-0 rounded-full overflow-hidden bg-white/10 border border-white/20">
            {alumni.photo_url ? (
              <Image src={alumni.photo_url} alt={alumni.name} fill sizes="44px" className="object-cover object-top" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-sm text-white/60">{initials(alumni.name)}</span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-serif text-lg font-bold text-white leading-tight">{alumni.name}</h3>
              {alumni.linkedin_url && (
                <a
                  href={alumni.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 opacity-60 group-hover:opacity-100 hover:!opacity-70 transition-opacity duration-base -m-3.5 p-3.5"
                  aria-label={`${alumni.name} on LinkedIn`}
                >
                  <LinkedInIcon />
                </a>
              )}
            </div>
            <p className="text-xs uppercase tracking-widest text-white/70 mt-1">{alumni.role}</p>
            {alumni.current_company && (
              <p className="text-sm font-semibold text-white mt-2 flex items-center gap-1.5">
                <svg className="w-3 h-3 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0H5m14 0H5m0 0H3" />
                </svg>
                {alumni.current_company}
              </p>
            )}
            {alumni.graduation_year && (
              <p className="text-xs text-white/50 mt-1">Class of {alumni.graduation_year}</p>
            )}
            {alumni.industry && (
              <span className="inline-block mt-3 text-[11px] px-2.5 py-1 border border-white/25 text-white/80 tracking-wide">
                {alumni.industry}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AlumniGrid({ alumni }: { alumni: Alumni[] }) {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null)

  const sorted = [...alumni].sort((a, b) => {
    const ai = a.order_index ?? null
    const bi = b.order_index ?? null
    if (ai === null && bi === null) return 0
    if (ai === null) return 1
    if (bi === null) return -1
    return ai - bi
  })

  // Only show industry tags that exist in the data
  const presentIndustries = INDUSTRY_OPTIONS.filter(ind =>
    sorted.some(a => a.industry === ind)
  )

  const filtered = selectedIndustry
    ? sorted.filter(a => a.industry === selectedIndustry)
    : sorted

  return (
    <div>
      {/* Industry filter: one compact dropdown instead of a wall of tags */}
      {presentIndustries.length > 0 && (
        <Reveal direction="down" className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-y border-line py-4">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500">
              {filtered.length} {filtered.length === 1 ? 'alumnus' : 'alumni'}
              {selectedIndustry ? <span className="text-ink-400"> in {selectedIndustry}</span> : null}
            </p>
            <div className="flex items-center gap-4">
              {selectedIndustry && (
                <button
                  type="button"
                  onClick={() => setSelectedIndustry(null)}
                  className="text-xs tracking-wide text-ink-500 underline underline-offset-4 hover:text-ink-900 transition-colors duration-fast"
                >
                  Clear
                </button>
              )}
              <label className="relative block">
                <span className="sr-only">Filter by industry</span>
                <select
                  value={selectedIndustry ?? ''}
                  onChange={e => setSelectedIndustry(e.target.value || null)}
                  className="appearance-none bg-white text-forest text-xs font-medium tracking-wide border border-forest pl-4 pr-10 py-2.5 min-w-[15rem] w-full sm:w-auto cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-forest"
                >
                  <option value="">All industries</option>
                  {presentIndustries.map(ind => (
                    <option key={ind} value={ind}>
                      {ind} ({sorted.filter(a => a.industry === ind).length})
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-forest"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </label>
            </div>
          </div>
        </Reveal>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-ink-500 text-sm text-center py-8">
          No alumni in this industry yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i * 60, 360)} direction="up">
              <AlumniCard alumni={a} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  )
}
