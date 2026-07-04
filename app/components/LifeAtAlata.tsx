'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Reveal from './Reveal'

type Tile = {
  kind: 'video' | 'photo'
  src: string
  caption: string
  /** desktop grid span within a 4-column bento */
  span: string
  sizes: string
}

// Mixed-format editorial bento: tall tiles for the portrait clips, wide tiles
// for the landscape stills — no uniform vertical columns.
const TILES: Tile[] = [
  { kind: 'video', src: '/redesign/palazzo-3.mp4', caption: 'Members’ Reception', span: 'md:col-span-1 md:row-span-2', sizes: '(max-width:768px) 100vw, 25vw' },
  { kind: 'photo', src: '/redesign/evento-sala.png', caption: 'Speaker Sessions', span: 'md:col-span-2 md:row-span-1', sizes: '(max-width:768px) 100vw, 50vw' },
  { kind: 'video', src: '/redesign/vigna-2.mp4', caption: 'Summer Social', span: 'md:col-span-1 md:row-span-2', sizes: '(max-width:768px) 100vw, 25vw' },
  { kind: 'photo', src: '/redesign/evento-aperitivo.png', caption: 'Networking', span: 'md:col-span-1 md:row-span-1', sizes: '(max-width:768px) 100vw, 25vw' },
  { kind: 'photo', src: '/redesign/paintball-gruppo.jpeg', caption: 'Team Building', span: 'md:col-span-1 md:row-span-1', sizes: '(max-width:768px) 100vw, 25vw' },
  { kind: 'video', src: '/redesign/palazzo-2.mp4', caption: 'Roundtables', span: 'md:col-span-4 md:row-span-1', sizes: '100vw' },
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
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
    />
  )
}

export default function LifeAtAlata() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal className="mb-12">
          <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Behind the Scenes</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Life at Alata</h2>
          <div className="w-10 h-px bg-forest" />
        </Reveal>

        <Reveal delay={120}>
          <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[180px] md:auto-rows-[200px] gap-4">
            {TILES.map((tile) => (
              <figure
                key={tile.src}
                className={`group relative overflow-hidden bg-paper-stone border border-line ${tile.span}`}
              >
                {tile.kind === 'video' ? (
                  <InViewVideo src={tile.src} />
                ) : (
                  <Image
                    src={tile.src}
                    alt={tile.caption}
                    fill
                    sizes={tile.sizes}
                    className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]"
                  />
                )}
                {/* Caption — quiet by default, brightens on hover */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/55 to-transparent">
                  <figcaption className="text-[11px] tracking-[0.2em] uppercase text-white/85">
                    {tile.caption}
                  </figcaption>
                </div>
              </figure>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
