'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Partner } from '@/lib/types'

export default function SponsorsTable() {
  const [sponsors, setSponsors] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    createClient()
      .from('partners')
      .select('*')
      .eq('type', 'sponsor')
      .order('order_index', { ascending: true })
      .then(({ data }) => { setSponsors((data ?? []) as Partner[]); setLoading(false) })
  }, [])

  const filtered = sponsors.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sponsors…"
          className="w-full max-w-xs border border-line px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white"
        />
      </div>

      {loading ? (
        <p className="text-sm text-ink-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-400">No sponsors found.</p>
      ) : (
        <div className="bg-white border border-line-faint">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_2fr_1fr_80px] gap-4 px-6 py-3 bg-[#f9f9f9] border-b border-line-faint">
            <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Name</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Website</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Added</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-ink-400">Clicks</span>
          </div>

          {filtered.map(s => (
            <div
              key={s.id}
              className="grid grid-cols-[2fr_2fr_1fr_80px] gap-4 px-6 py-4 border-b border-line-faint last:border-b-0 items-center hover:bg-[#fafafa] transition-colors"
            >
              {/* Name + logo */}
              <div className="flex items-center gap-3 min-w-0">
                {s.logo_url && (
                  <img
                    src={s.logo_url}
                    alt={s.name}
                    className="w-8 h-8 object-contain flex-shrink-0 border border-line-faint bg-white p-0.5"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-ink-400 truncate">{s.description}</p>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="min-w-0">
                {s.website_url ? (
                  <a
                    href={s.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-forest hover:underline truncate block"
                  >
                    {s.website_url}
                  </a>
                ) : (
                  <span className="text-xs text-ink-300">—</span>
                )}
              </div>

              {/* Added */}
              <span className="text-xs text-ink-400">
                {new Date(s.created_at).toLocaleDateString('it-IT')}
              </span>

              {/* Click count */}
              <span className="text-xs font-semibold text-ink-900">{s.click_count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
