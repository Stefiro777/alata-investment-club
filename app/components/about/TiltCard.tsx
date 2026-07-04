'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Cursor-reactive 3D tilt. Wraps a card and rotates it in perspective toward
 * the pointer, with a soft lift. Purely presentational; disabled for
 * reduced-motion and touch devices (where it would fight scrolling).
 */
export default function TiltCard({
  children,
  className = '',
  max = 7,
}: {
  children: ReactNode
  className?: string
  /** max rotation in degrees */
  max?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return

    let raf = 0
    let rx = 0
    let ry = 0

    const apply = () => {
      raf = 0
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(-4px)`
    }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width - 0.5
      const py = (e.clientY - r.top) / r.height - 0.5
      ry = px * max * 2
      rx = -py * max * 2
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      rx = 0
      ry = 0
      el.style.transform = 'perspective(900px) rotateX(0) rotateY(0) translateY(0)'
    }

    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [max])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transformStyle: 'preserve-3d',
        transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}
