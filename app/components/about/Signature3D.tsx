'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Reveal from '../Reveal'

// Canvas is client-only (WebGL) and code-split so three.js never ships with the
// initial bundle — it loads only when this section approaches the viewport.
const Signature3DCanvas = dynamic(() => import('./Signature3DCanvas'), {
  ssr: false,
  loading: () => null,
})

export default function Signature3D() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [allow3D, setAllow3D] = useState(true)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    // Guard against environments without WebGL.
    let webgl = false
    try {
      const c = document.createElement('canvas')
      webgl = !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch {
      webgl = false
    }
    setAllow3D(!reduced && webgl)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <section className="relative bg-forest-deep text-white overflow-hidden">
      <div className="hero-vignette absolute inset-0 opacity-60 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-24 sm:py-28 grid lg:grid-cols-12 gap-10 items-center">
        {/* Copy */}
        <div className="lg:col-span-4 order-2 lg:order-1">
          <Reveal direction="right">
            <p className="text-xs tracking-[0.3em] uppercase text-white/45 mb-5">The name</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-semibold leading-[1.08] mb-5">
              Alata
            </h2>
            <div className="w-10 h-px bg-white/30 mb-6" />
            <p className="text-white/65 text-base leading-relaxed">
              The name honors the Winged Victory of Brescia, the Roman bronze statue unearthed
              in the city in 1826 and now among Italy&rsquo;s most celebrated ancient treasures,
              housed at the Museo di Santa Giulia. For nearly two centuries it has stood as a
              symbol of Brescia itself — an image of ambition, achievement, and flight toward
              something greater. We took it as our own.
            </p>
          </Reveal>
        </div>

        {/* 3D stage */}
        <div ref={ref} className="lg:col-span-8 order-1 lg:order-2">
          <div className="relative w-full h-[380px] sm:h-[460px] lg:h-[520px]">
            {allow3D && inView ? (
              <Signature3DCanvas />
            ) : (
              // Reduced-motion / no-WebGL fallback: a quiet static mark.
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-serif text-[9rem] leading-none text-white/[0.06] select-none">
                  A
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
