'use client'

import { useState, useRef, useEffect } from 'react'
import { TEAM_BADGE } from './teamColors'

type Member = {
  user_id: string
  full_name: string
  role?: string
  teams?: string[] | null
  lab_subdivision?: string | null
}

function getMemberBadges(m: Member) {
  const badges: Array<{ bg: string; text: string; label: string }> = []
  if (m.role === 'bod') {
    badges.push(TEAM_BADGE.bod)
  } else if (m.role === 'director') {
    badges.push(TEAM_BADGE.management)
  }
  for (const team of m.teams ?? []) {
    if (TEAM_BADGE[team]) badges.push(TEAM_BADGE[team])
  }
  return badges
}

export default function MemberAutocomplete({
  members,
  selectedUids,
  onChange,
}: {
  members: Member[]
  selectedUids: string[]
  onChange: (uids: string[]) => void
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const filtered = query.trim()
    ? members
        .filter(m => !selectedUids.includes(m.user_id))
        .filter(m => m.full_name.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 5)
    : []

  function add(uid: string) {
    if (!selectedUids.includes(uid)) onChange([...selectedUids, uid])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function remove(uid: string) {
    onChange(selectedUids.filter(u => u !== uid))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
    if ((e.key === 'Enter' || e.key === 'Tab') && filtered.length > 0) {
      e.preventDefault()
      add(filtered[0].user_id)
    }
  }

  const selectedMembers = selectedUids
    .map(uid => members.find(m => m.user_id === uid))
    .filter(Boolean) as Member[]

  return (
    <div className="flex flex-col gap-2">
      {/* Selected badges */}
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedMembers.map(m => (
            <span
              key={m.user_id}
              className="flex items-center gap-1.5 bg-[#1a4a3a] text-white text-xs font-medium px-2 py-0.5"
            >
              {m.full_name}
              <button
                type="button"
                onClick={() => remove(m.user_id)}
                className="hover:text-white/70 transition-colors leading-none"
                aria-label={`Rimuovi ${m.full_name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative" ref={containerRef}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Cerca membro..."
          className="w-full border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest"
        />

        {open && query.trim() && (
          <div className="absolute top-full left-0 right-0 z-30 bg-white border border-line border-t-0 shadow-md">
            {filtered.length === 0 ? (
              <p className="px-4 py-2.5 text-xs text-ink-400">Nessun membro trovato.</p>
            ) : (
              filtered.map(m => {
                const badges = getMemberBadges(m)
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); add(m.user_id) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#f5f5f5] border-b border-line last:border-b-0"
                  >
                    <p className="text-sm font-medium text-ink-900">{m.full_name}</p>
                    {(badges.length > 0 || m.lab_subdivision) && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {badges.map((b, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-px"
                            style={{ backgroundColor: b.bg, color: b.text }}
                          >
                            {b.label}
                          </span>
                        ))}
                        {m.lab_subdivision && (
                          <span className="text-xs text-ink-400">{m.lab_subdivision}</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
