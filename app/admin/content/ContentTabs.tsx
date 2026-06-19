'use client'

import { type ReactNode } from 'react'

export default function ContentTabs({
  reportsContent,
}: {
  reportsContent: ReactNode
  eventsContent?: ReactNode
  partnersContent?: ReactNode
}) {
  return (
    <div>
      {/* Tab bar — Reports only */}
      <div className="sticky top-[56px] z-20 bg-white border-b border-line-faint overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-5xl mx-auto px-8 flex items-center gap-0">
          <button
            className="px-6 py-4 text-xs font-medium tracking-widest uppercase whitespace-nowrap border-b-2 border-forest text-forest"
          >
            Reports
          </button>
        </div>
      </div>

      <div>{reportsContent}</div>
    </div>
  )
}
