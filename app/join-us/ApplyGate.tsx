'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type Track = 'analyst' | 'member'
const EVENT = 'join-apply-open'

/** Link to an application form: it reveals the form (hidden until now) and scrolls to it. */
export function ApplyTrigger({ track, className, children }: { track: Track; className?: string; children: ReactNode }) {
  return (
    <a
      href={`#apply-${track}`}
      className={className}
      onClick={e => {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent<Track>(EVENT, { detail: track }))
      }}
    >
      {children}
    </a>
  )
}

/** An application section that stays out of the page until its own button is pressed. */
export function ApplyGate({ track, className, children }: { track: Track; className: string; children: ReactNode }) {
  const [shown, setShown] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const pending = useRef(false)

  useEffect(() => {
    const open = () => { pending.current = true; setShown(true) }
    const onEvent = (e: Event) => { if ((e as CustomEvent<Track>).detail === track) open() }
    window.addEventListener(EVENT, onEvent)
    // Arriving on /join-us#apply-analyst (or #apply-member) opens that form.
    const raf = requestAnimationFrame(() => { if (location.hash === `#apply-${track}`) open() })
    return () => { window.removeEventListener(EVENT, onEvent); cancelAnimationFrame(raf) }
  }, [track])

  useEffect(() => {
    if (shown && pending.current) {
      pending.current = false
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [shown])

  if (!shown) return null
  return <section ref={ref} id={`apply-${track}`} className={className}>{children}</section>
}
