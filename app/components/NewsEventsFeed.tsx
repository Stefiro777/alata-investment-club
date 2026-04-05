'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import NewsCard, { type NewsItem } from './NewsCard'
import Reveal from './Reveal'

export default function NewsEventsFeed() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchData = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('contenuti')
        .select('id, titolo, descrizione, short_description, full_description, immagine_url, photos, tag, tipo, data_pubblicazione, link')
        .in('tipo', ['evento', 'aggiornamento', 'news'])
        .order('data_pubblicazione', { ascending: false })
        .limit(3)
      if (isMounted) {
        setItems((data as NewsItem[]) ?? [])
        setLoading(false)
      }
    }
    fetchData()
    return () => { isMounted = false }
  }, [])

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal className="mb-12 border-b border-[#e5e5e5] pb-6 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-2">Latest</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a]">News &amp; Events</h2>
          </div>
          <Link
            href="/events"
            className="shrink-0 inline-flex items-center gap-2 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-semibold tracking-wide uppercase px-6 py-2.5 transition-colors duration-150"
          >
            See all events
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </Reveal>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="border border-black/10 border-l-4 border-l-[#1a4a3a] overflow-hidden animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="h-64 bg-[#f5f5f5]" />
                <div className="p-6 flex flex-col gap-3">
                  <div className="h-3 bg-[#e5e5e5] w-24 rounded" />
                  <div className="h-5 bg-[#e5e5e5] w-full rounded" />
                  <div className="h-5 bg-[#e5e5e5] w-3/4 rounded" />
                  <div className="h-3 bg-[#e5e5e5] w-full rounded mt-2" />
                  <div className="h-3 bg-[#e5e5e5] w-5/6 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-[#6b7280]">
            <p className="text-sm tracking-wide">No events or updates available at the moment.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {items.map((item, i) => (
              <Reveal key={item.id} delay={i * 100} direction="up">
                <NewsCard item={item} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
