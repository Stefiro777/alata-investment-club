'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Parallax from '../Parallax'
import { EASE } from '../motion/Motion'

/**
 * About/home hero — cinematic still with layered depth.
 * The background and the content sit on separate planes that drift with the
 * cursor (and the background keeps its slow scroll parallax + ken burns).
 * No ambient video: the motion carries it. Reduced-motion users get a clean still.
 */
/** Sequenced hero entrance: blur + rise, one element per beat. */
function HeroBeat({
  children,
  delay,
  className,
}: {
  children: React.ReactNode
  delay: number
  className?: string
}) {
  const reduced = useReducedMotion()
  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

export default function AboutHero() {
  const sectionRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return // skip on touch

    let raf = 0
    let tx = 0
    let ty = 0

    const apply = () => {
      raf = 0
      if (bgRef.current) bgRef.current.style.transform = `translate3d(${(-tx * 18).toFixed(1)}px, ${(-ty * 14).toFixed(1)}px, 0) scale(1.06)`
      if (contentRef.current) contentRef.current.style.transform = `translate3d(${(tx * 10).toFixed(1)}px, ${(ty * 8).toFixed(1)}px, 0)`
    }

    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2 // -1..1
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2
      if (!raf) raf = requestAnimationFrame(apply)
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      if (!raf) raf = requestAnimationFrame(apply)
    }

    section.addEventListener('pointermove', onMove)
    section.addEventListener('pointerleave', onLeave)
    return () => {
      section.removeEventListener('pointermove', onMove)
      section.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden min-h-[620px] lg:min-h-[calc(100svh-64px)] text-white flex items-center"
    >
      {/* Background plane — drifts opposite the cursor, over the scroll parallax */}
      <div ref={bgRef} className="absolute inset-0 will-change-transform" style={{ transform: 'scale(1.06)' }}>
        <Parallax>
          <Image
            src="/redesign/loggia-hd.jpg"
            fill
            alt=""
            className="object-cover grayscale animate-ken-burns"
            preload
          />
        </Parallax>
        <div className="absolute inset-0" style={{ background: 'rgba(26, 74, 58, 0.72)' }} />
        <div className="absolute inset-0 hero-vignette" />
      </div>

      {/* Content plane — drifts subtly with the cursor */}
      <div ref={contentRef} className="relative z-10 w-full py-28 sm:py-36 will-change-transform">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h1 className="font-serif text-6xl sm:text-7xl lg:text-8xl font-semibold text-white leading-[1.05] mb-3">
              <span className="hero-mask">
                <span className="hero-mask-inner" style={{ animationDelay: '0.15s' }}>Alata</span>
              </span>
              <span className="hero-mask">
                <span className="hero-mask-inner italic" style={{ animationDelay: '0.32s' }}>Investment Club</span>
              </span>
            </h1>
            <HeroBeat delay={0.5}>
              <p className="font-serif italic text-base text-white opacity-70 mt-1 tracking-widest">
                Est. 2023
              </p>
            </HeroBeat>
            <HeroBeat delay={0.65}>
              <div className="w-16 h-px bg-white/30 mt-8 mb-10" />
            </HeroBeat>
            <HeroBeat delay={0.8} className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/join-us"
                className="inline-block bg-white text-forest text-xs font-semibold tracking-[0.2em] uppercase px-10 py-4 hover:bg-white/90 transition-colors duration-fast"
              >
                Join the Club
              </Link>
              <Link
                href="/reports"
                className="inline-block border border-white/40 text-white text-xs font-semibold tracking-[0.2em] uppercase px-10 py-4 hover:bg-white hover:text-forest hover:border-white transition-colors duration-base"
              >
                Our Research
              </Link>
            </HeroBeat>
          </div>
        </div>
      </div>
    </section>
  )
}
