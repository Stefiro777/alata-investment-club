'use client'

import { useState, type ReactNode } from 'react'

type Tab = 'reports' | 'events' | 'partners'

const TABS: { id: Tab; label: string }[] = [
  { id: 'reports', label: 'Reports' },
  { id: 'events', label: 'Events' },
  { id: 'partners', label: 'Partners' },
]

export default function ContentTabs({
  reportsContent,
  eventsContent,
  partnersContent,
}: {
  reportsContent: ReactNode
  eventsContent: ReactNode
  partnersContent: ReactNode
}) {
  const [active, setActive] = useState<Tab>('reports')

  return (
    <div>
      {/* Tab bar */}
      <div className="sticky top-[56px] z-20 bg-white border-b border-black/10 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-5xl mx-auto px-8 flex items-center gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`px-6 py-4 text-xs font-medium tracking-widest uppercase whitespace-nowrap border-b-2 transition-colors duration-150 ${
                active === tab.id
                  ? 'border-[#1a4a3a] text-[#1a4a3a]'
                  : 'border-transparent text-[#6b7280] hover:text-[#0a0a0a] hover:border-black/20'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content panels — all rendered, visibility toggled to avoid re-mounting */}
      <div style={{ display: active === 'reports' ? 'block' : 'none' }}>
        {reportsContent}
      </div>
      <div style={{ display: active === 'events' ? 'block' : 'none' }}>
        {eventsContent}
      </div>
      <div style={{ display: active === 'partners' ? 'block' : 'none' }}>
        {partnersContent}
      </div>
    </div>
  )
}
