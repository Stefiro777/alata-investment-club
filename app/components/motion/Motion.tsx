'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode, CSSProperties } from 'react'

/** House easing — same curve the CSS system uses everywhere. */
export const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Cinematic entrance: blur + opacity + translate settle into place.
 * Sequenced sections pass incremental `delay`s (0.15, 0.30, …).
 * Falls back to a plain div under prefers-reduced-motion.
 */
export function MotionReveal({
  children,
  delay = 0,
  duration = 0.8,
  y = 24,
  x = 0,
  blur = 8,
  amount = 0.2,
  className,
  style,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  y?: number
  x?: number
  blur?: number
  /** portion of the element that must be in view before it plays */
  amount?: number
  className?: string
  style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  if (reduced) {
    return <div className={className} style={style}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, y, x, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/**
 * A hairline that draws itself when scrolled into view.
 * Give it explicit dimensions/colors via className; this only animates scale.
 */
export function MotionLine({
  orientation = 'horizontal',
  delay = 0,
  duration = 1.1,
  className,
  style,
}: {
  orientation?: 'horizontal' | 'vertical'
  delay?: number
  duration?: number
  className?: string
  style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  const axis = orientation === 'horizontal' ? 'scaleX' : 'scaleY'
  if (reduced) {
    return <div className={className} style={style} aria-hidden="true" />
  }
  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ ...style, transformOrigin: orientation === 'horizontal' ? 'left' : 'top' }}
      initial={{ [axis]: 0 } as Record<string, number>}
      whileInView={{ [axis]: 1 } as Record<string, number>}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration, delay, ease: EASE }}
    />
  )
}

/**
 * Photo/panel entrance: a left-to-right clip-path wipe combined with a
 * soft blur settle. Wrap the framed element.
 */
export function MotionWipe({
  children,
  delay = 0,
  duration = 1.0,
  className,
  style,
}: {
  children: ReactNode
  delay?: number
  duration?: number
  className?: string
  style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  if (reduced) {
    return <div className={className} style={style}>{children}</div>
  }
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ clipPath: 'inset(0 100% 0 0)', filter: 'blur(6px)', opacity: 0.4 }}
      whileInView={{ clipPath: 'inset(0 0% 0 0)', filter: 'blur(0px)', opacity: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}
