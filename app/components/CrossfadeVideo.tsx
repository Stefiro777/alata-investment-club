'use client'

import { useEffect, useRef } from 'react'

const FADE = 0.5 // seconds — dissolve into the loop over the clip's last half second

/**
 * Seamless-loop video: two stacked <video> elements with the same source.
 * A rAF loop watches the playhead; half a second before the end, the second
 * copy starts from 0 on top and fades in, so the loop never visibly "snaps".
 * Playback pauses entirely while the tile is out of the viewport.
 */
export default function CrossfadeVideo({ src, className = '' }: { src: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const aRef = useRef<HTMLVideoElement>(null)
  const bRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const a = aRef.current
    const b = bRef.current
    if (!wrap || !a || !b) return

    let front = a
    let back = b
    let fading = false
    let visible = false
    let raf = 0
    let timeout = 0

    const tick = () => {
      raf = visible ? requestAnimationFrame(tick) : 0
      if (!visible || fading) return
      const d = front.duration
      if (!isFinite(d) || d <= 0) return
      if (d - front.currentTime <= FADE + 0.05) {
        fading = true
        // Incoming copy on top, from the first frame
        back.style.zIndex = '2'
        front.style.zIndex = '1'
        try { back.currentTime = 0 } catch { /* not seekable yet */ }
        back.play().catch(() => {})
        back.style.opacity = '1'
        const finished = front
        timeout = window.setTimeout(() => {
          finished.pause()
          finished.style.opacity = '0'
          try { finished.currentTime = 0 } catch { /* ignore */ }
          front = back
          back = finished
          fading = false
        }, FADE * 1000)
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) {
          front.play().catch(() => {})
          if (fading) back.play().catch(() => {})
          if (!raf) raf = requestAnimationFrame(tick)
        } else {
          a.pause()
          b.pause()
        }
      },
      { threshold: 0.35 }
    )
    io.observe(wrap)

    return () => {
      io.disconnect()
      if (raf) cancelAnimationFrame(raf)
      if (timeout) clearTimeout(timeout)
    }
  }, [])

  const videoCls = 'absolute inset-0 w-full h-full object-cover'
  const fadeStyle = { transition: `opacity ${FADE}s ease` } as const

  return (
    <div ref={wrapRef} className={`absolute inset-0 ${className}`}>
      <video ref={aRef} src={src} muted playsInline preload="auto" className={videoCls} style={{ ...fadeStyle, opacity: 1, zIndex: 2 }} />
      <video ref={bRef} src={src} muted playsInline preload="auto" className={videoCls} style={{ ...fadeStyle, opacity: 0, zIndex: 1 }} />
    </div>
  )
}
