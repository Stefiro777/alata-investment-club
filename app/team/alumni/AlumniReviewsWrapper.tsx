'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import ReviewsSection from '@/app/components/ReviewsSection'

export default function AlumniReviewsWrapper() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'show_alumni_reviews')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value === 'true') setShow(true)
      })
  }, [])

  if (!show) return null
  return <ReviewsSection type="alumni" title="Alumni Voices" />
}
