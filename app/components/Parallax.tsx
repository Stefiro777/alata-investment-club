'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Subtle scroll parallax for hero backgrounds.
 * Wrap an absolutely-positioned background; children are translated
 * vertically as the section scrolls. The wrapper is slightly oversized
 * (via `overscan`) so the shift never reveals gaps at the edges.
 */
export default function Parallax({
  children,
  factor = 0.12,
  overscan = 60,
  className = '',
}: {
  children: ReactNode
  /** 0–1: fraction of scroll distance applied as translation */
  factor?: number
  /** extra px of bleed on top and bottom so edges never show */
  overscan?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.parentElement?.getBoundingClientRect()
      if (!rect) return
      // Progress of the section through the viewport: 0 (entering) → 1 (leaving)
      const total = rect.height + window.innerHeight
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / total))
      const shift = (progress - 0.5) * 2 * overscan * factor * 4
      el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [factor, overscan])

  return (
    <div
      ref={ref}
      className={className}
      style={{ position: 'absolute', top: -overscan, bottom: -overscan, left: 0, right: 0, willChange: 'transform' }}
    >
      {children}
    </div>
  )
}
