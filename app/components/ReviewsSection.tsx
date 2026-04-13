'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Review } from '@/lib/types'
import Reveal from './Reveal'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-base">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={i <= rating ? 'text-[#1a4a3a]' : 'text-gray-200'}>
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
    <section className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal direction="up">
          <h2 className="font-serif text-4xl font-bold text-[#1a4a3a] mb-12">{title}</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <Reveal key={review.id} direction="up" delay={i * 80}>
              <div className="border border-gray-200 p-6 flex flex-col gap-4 h-full">
                {review.rating != null && <StarRating rating={review.rating} />}
                <p className="text-gray-700 text-sm italic flex-1">
                  &ldquo;{review.content}&rdquo;
                </p>
                <div className="border-t border-gray-200 pt-4">
                  <p className="font-serif text-[#1a4a3a] font-semibold">{review.author_name}</p>
                  {review.author_role && (
                    <p className="text-gray-400 text-xs mt-0.5">{review.author_role}</p>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
