'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Reveal from './Reveal'

type Tile =
  | { kind: 'video'; src: string; caption: string }
  | { kind: 'photo'; src: string; caption: string }

const TILES: Tile[] = [
  { kind: 'video', src: '/redesign/palazzo-3.mp4', caption: 'Members’ Reception' },
  { kind: 'photo', src: '/redesign/evento-sala.png', caption: 'Speaker Sessions' },
  { kind: 'video', src: '/redesign/palazzo-2.mp4', caption: 'Roundtables' },
  { kind: 'photo', src: '/redesign/evento-aperitivo.png', caption: 'Networking' },
  { kind: 'video', src: '/redesign/vigna-2.mp4', caption: 'Summer Social' },
  { kind: 'photo', src: '/redesign/paintball-gruppo.jpeg', caption: 'Team Building' },
]

/** Plays muted and loops only while visible in the viewport. */
function InViewVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.35 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      className="absolute inset-0 w-full h-full object-cover"
    />
  )
}

export default function LifeAtAlata() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  function updateArrows() {
    const el = scrollerRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 8)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  function scrollByTiles(dir: 1 | -1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' })
  }

  return (
    <section className="bg-white py-20 sm:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal className="mb-12 flex items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Behind the Scenes</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Life at Alata</h2>
            <div className="w-10 h-px bg-forest" />
          </div>
          {/* Arrows — desktop only */}
          <div className="hidden md:flex items-center gap-px">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollByTiles(-1)}
              disabled={!canLeft}
              className="w-11 h-11 border border-line flex items-center justify-center text-ink-900 hover:border-forest hover:text-forest disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-900 transition-colors duration-fast"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollByTiles(1)}
              disabled={!canRight}
              className="w-11 h-11 border border-line flex items-center justify-center text-ink-900 hover:border-forest hover:text-forest disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-900 transition-colors duration-fast"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </Reveal>
      </div>

      {/* Filmstrip — bleeds to the right edge of the viewport */}
      <Reveal delay={150}>
        <div
          ref={scrollerRef}
          onScroll={updateArrows}
          className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'none',
            paddingLeft: 'max(1.5rem, calc((100vw - 80rem) / 2 + 2rem))',
            scrollPaddingLeft: 'max(1.5rem, calc((100vw - 80rem) / 2 + 2rem))',
            paddingRight: '1.5rem',
          }}
        >
          {TILES.map((tile, i) => (
            <figure key={tile.src} className="snap-start shrink-0 w-[240px] sm:w-[280px]">
              <div className="relative aspect-[9/16] overflow-hidden bg-paper-stone border border-line">
                {tile.kind === 'video' ? (
                  <InViewVideo src={tile.src} />
                ) : (
                  <Image
                    src={tile.src}
                    alt={tile.caption}
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                )}
              </div>
              <figcaption className="mt-4 flex items-baseline justify-between gap-3">
                <span className="text-[11px] tracking-[0.2em] uppercase text-ink-500">{tile.caption}</span>
                <span className="font-serif text-sm text-ink-300">{String(i + 1).padStart(2, '0')}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
