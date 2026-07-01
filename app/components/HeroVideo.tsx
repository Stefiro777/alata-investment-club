'use client'

import { useEffect, useState } from 'react'

/**
 * Ambient hero video layered above a static fallback image.
 * Mounts only on wide viewports without prefers-reduced-motion,
 * and fades in once playable — the image below covers every other case.
 */
export default function HeroVideo({ src, className = '' }: { src: string; className?: string }) {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (wide && !reduced) setEnabled(true)
  }, [])

  if (!enabled) return null

  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      onCanPlay={() => setReady(true)}
      className={className}
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 1.4s ease' }}
    />
  )
}
