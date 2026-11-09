'use client'

import { type ReactNode } from 'react'
import { pillClass } from '@/app/components/member/ui'

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
      <div role="tablist" className="mb-2 flex flex-wrap gap-2">
        <span role="tab" aria-selected="true" className={pillClass({ active: true })}>Reports</span>
      </div>

      <div>{reportsContent}</div>
    </div>
  )
}
