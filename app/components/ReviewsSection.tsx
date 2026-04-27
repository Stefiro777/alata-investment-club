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
            const isRight = i % 2 === 1
            return (
              <Reveal key={review.id} direction="up" delay={i * 80}>
                <div className={`py-8 px-0${i < reviews.length - 1 ? ' border-b border-forest/10' : ''}`}>
                  <div className={`max-w-[65%]${isRight ? ' ml-auto text-right' : ' mr-auto'}`}>
                    {review.rating != null && (
                      <div className={`mb-3${isRight ? ' flex justify-end' : ''}`}>
                        <StarRating rating={review.rating} />
                      </div>
                    )}
                    <div className="relative">
                      <span className={`absolute top-0 font-serif text-7xl text-forest opacity-15 leading-none pointer-events-none select-none${isRight ? ' left-0' : ' right-0'}`}>
                        &ldquo;
                      </span>
                      <p className={`text-gray-700 text-base leading-relaxed${isRight ? ' pl-12' : ' pr-12'}`}>
                        {review.content}
                      </p>
                    </div>
                    <div className="border-t border-forest/20 my-6" />
                    <p className="font-serif text-forest text-xl font-bold">{review.author_name}</p>
                    {review.author_role && (
                      <p className="text-xs uppercase tracking-widest text-gray-400 mt-1">{review.author_role}</p>
                    )}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
