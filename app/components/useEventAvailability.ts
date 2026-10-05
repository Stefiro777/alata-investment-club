'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { EventAvailability } from '@/lib/types'

/**
 * Seat availability per event id (public RPC get_event_availability: no
 * personal data). Empty until loaded, and stays empty if the RPC is not
 * available, in which case no event is shown as sold out.
 */
export function useEventAvailability(): Record<string, EventAvailability> {
  const [map, setMap] = useState<Record<string, EventAvailability>>({})

  useEffect(() => {
    let cancelled = false
    createClient()
      .rpc('get_event_availability')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const next: Record<string, EventAvailability> = {}
        for (const row of data as EventAvailability[]) next[row.event_id] = row
        setMap(next)
      })
    return () => { cancelled = true }
  }, [])

  return map
}
