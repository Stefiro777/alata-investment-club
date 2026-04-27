'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Review } from '@/lib/types'
import Reveal from './Reveal'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-base">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-forest' : 'text-forest opacity-20'}>
          ★
        </span>
      ))}
    </div>
  )
}

export default function ReviewsSection({
  type,
  title = 'Reviews',
}: {
  type: 'alumni' | 'events'
  title?: string
}) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('reviews')
      .select('*')
      .eq('type', type)
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReviews((data ?? []) as Review[])
        setLoading(false)
      })
  }, [type])

  if (loading || reviews.length === 0) return null

  return (
    <section className="py-20 bg-[#f5f5f0] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal direction="up">
          <h2 className="font-serif text-5xl font-bold text-forest text-left">{title}</h2>
          <div className="w-12 h-px bg-forest mt-4 mb-8" />
        </Reveal>

        <div>
          {reviews.map((review, i) => {
            const isEven = i % 2 === 1
            return (
              <Reveal key={review.id} direction="up" delay={i * 80}>
                <div className={i < reviews.length - 1 ? 'border-t border-line' : 'border-t border-line'}>
                  {!isEven ? (
                    /* Odd (0, 2, 4…): author left, quote right */
                    <div className="grid grid-cols-[35%_65%] gap-8 py-12">
                      <div>
                        {review.rating != null && <div className="mb-3"><StarRating rating={review.rating} /></div>}
                        <p className="font-semibold text-ink-900">{review.author_name}</p>
                        {review.author_role && (
                          <p className="font-sans text-[11px] tracking-[0.10em] uppercase text-ink-400 mt-1">{review.author_role}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-ink-700 leading-relaxed">{review.content}</p>
                      </div>
                    </div>
                  ) : (
                    /* Even (1, 3, 5…): quote left, author right */
                    <div className="grid grid-cols-[65%_35%] gap-8 py-12">
                      <div>
                        <p className="text-ink-700 leading-relaxed">{review.content}</p>
                      </div>
                      <div className="text-right">
                        {review.rating != null && <div className="mb-3 flex justify-end"><StarRating rating={review.rating} /></div>}
                        <p className="font-semibold text-ink-900">{review.author_name}</p>
                        {review.author_role && (
                          <p className="font-sans text-[11px] tracking-[0.10em] uppercase text-ink-400 mt-1">{review.author_role}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            )
          })}
          {reviews.length > 0 && <div className="border-t border-line" />}
        </div>
      </div>
    </section>
  )
}
