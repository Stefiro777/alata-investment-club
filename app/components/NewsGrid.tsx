'use client'

import { useReveal } from '@/lib/useReveal'
import NewsCard, { type NewsItem } from './NewsCard'

export default function NewsGrid({ items }: { items: NewsItem[] }) {
  const ref = useReveal<HTMLDivElement>({ threshold: 0.1 })

  if (items.length === 0) {
    return (
      <div className="py-20 text-center text-ink-500">
        <p className="text-sm tracking-wide">No events or updates available at the moment.</p>
      </div>
    )
  }

  return (
    <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line">
      {items.slice(0, 3).map((item, i) => (
        <div key={item.id} className="bg-paper" data-reveal-index={String(i)}>
          <NewsCard item={item} />
        </div>
      ))}
    </div>
  )
}
