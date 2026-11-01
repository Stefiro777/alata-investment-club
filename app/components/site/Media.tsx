'use client'

import { useEffect, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion'

/**
 * Full-bleed photo or muted looping video with the club's green veil on top.
 * Videos autoplay muted inline with a poster; under prefers-reduced-motion
 * only the poster is shown.
 */
export function VeiledMedia({
  image,
  video,
  poster,
  alt = '',
  veil = '#0b1d16',
  opacity = 0.6,
  objectPosition,
  className = '',
  priority = false,
}: {
  image?: string
  video?: string
  poster?: string
  alt?: string
  veil?: string
  opacity?: number
  objectPosition?: string
  className?: string
  priority?: boolean
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (reduced) { v.pause(); return }
    // Some browsers skip autoplay after hydration; nudge it.
    v.play().catch(() => {})
  }, [reduced])

  const mediaCls = 'absolute inset-0 h-full w-full object-cover'
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden={alt ? undefined : true}>
      {video && !reduced ? (
        <video
          ref={ref}
          className={mediaCls}
          style={{ objectPosition }}
          src={video}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={mediaCls}
          style={{ objectPosition }}
          src={video ? poster : image}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      <div className="absolute inset-0" style={{ background: veil, opacity }} />
    </div>
  )
}

/** The 3px reading bar fixed to the bottom edge, as on every board. */
export function ScrollProgress({ color = 'var(--club)' }: { color?: string }) {
  const { scrollYProgress } = useScroll()
  const reduced = useReducedMotion()
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 })
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[3px] origin-left"
      style={{ background: color, scaleX: reduced ? scrollYProgress : smooth }}
    />
  )
}
