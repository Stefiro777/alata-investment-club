'use client'

import { useEffect, useState } from 'react'

export type MemberAccessState = { loading: boolean; authenticated: boolean; active: boolean }

/** Membership of the current session (display only: the server re-checks on every purchase). */
export function useMemberAccess(): MemberAccessState {
  const [state, setState] = useState<MemberAccessState>({ loading: true, authenticated: false, active: false })

  useEffect(() => {
    let cancelled = false
    fetch('/api/membership/status', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        setState({ loading: false, authenticated: !!d?.authenticated, active: !!d?.active })
      })
      .catch(() => { if (!cancelled) setState({ loading: false, authenticated: false, active: false }) })
    return () => { cancelled = true }
  }, [])

  return state
}
