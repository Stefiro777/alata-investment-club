'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FeaturedGalleryItem, MediaItem } from '@/lib/types'
import Reveal from './Reveal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeVideoUrl(url: string): string {
  // YouTube: watch?v=ID → embed/ID
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  // Vimeo: vimeo.com/ID → player.vimeo.com/video/ID
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return url
}

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeSlide({ children, visible, delay, xOffset }: {
  children: ReactNode
  visible: boolean
  delay: number
  xOffset: number
}) {
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'none' : `translateX(${xOffset}px)`,
      transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      willChange: 'opacity, transform',
    }}>
      {children}
    </div>
  )
}

// ── Media display ─────────────────────────────────────────────────────────────

function MediaDisplay({ item }: { item: MediaItem }) {
  if (item.type === 'video') {
    return (
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={normalizeVideoUrl(item.url)}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={item.caption ?? 'Video'}
        />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt={item.caption ?? ''}
      className="w-full h-full object-cover"
      style={{ maxHeight: '420px' }}
    />
  )
}

function GalleryPanel({ media }: { media: MediaItem[] }) {
  const [active, setActive] = useState(0)

  if (media.length === 0) {
    return (
      <div className="flex items-center justify-center bg-[#f5f5f5] h-72 text-[#9ca3af] text-sm">
        No media
      </div>
    )
  }

  const current = media[active]

  return (
    <div>
      <div className="overflow-hidden bg-[#f5f5f5]" style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.10)' }}>
        <MediaDisplay item={current} />
        {current.caption && (
          <p className="text-xs text-[#6b7280] px-4 py-2 bg-white border-t border-black/5">{current.caption}</p>
        )}
      </div>
      {media.length > 1 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {media.map((m, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 border-2 transition-colors overflow-hidden ${i === active ? 'border-[#1a4a3a]' : 'border-transparent opacity-60 hover:opacity-80'}`}
              style={{ width: 56, height: 40 }}
              title={m.caption ?? `Item ${i + 1}`}
            >
              {m.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#1a4a3a]/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#1a4a3a]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single item section ───────────────────────────────────────────────────────

function GallerySection({
  item,
  imageLeft,
  bg,
  label,
}: {
  item: FeaturedGalleryItem
  imageLeft: boolean
  bg: string
  label: string
}) {
  const { ref: mediaRef, visible: mediaVisible } = useInView(0.1)
  const { ref: textRef, visible: textVisible } = useInView(0.12)
  const xText = imageLeft ? 32 : -32
  const s = (n: number) => n * 80

  return (
    <section style={{ background: bg }} className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* Media panel */}
          <div
            ref={mediaRef}
            className={imageLeft ? 'md:order-1' : 'md:order-2'}
            style={{
              opacity: mediaVisible ? 1 : 0,
              transform: mediaVisible ? 'scale(1)' : 'scale(0.97)',
              transition: 'opacity 800ms cubic-bezier(0.16,1,0.3,1) 100ms, transform 800ms cubic-bezier(0.16,1,0.3,1) 100ms',
              willChange: 'opacity, transform',
            }}
          >
            <GalleryPanel media={item.media ?? []} />
          </div>

          {/* Text panel */}
          <div ref={textRef} className={imageLeft ? 'md:order-2' : 'md:order-1'}>
            <FadeSlide visible={textVisible} delay={s(0)} xOffset={xText}>
              <div className="mb-5">
                <span
                  className="inline-block text-white font-medium uppercase"
                  style={{ background: '#1a4a3a', fontSize: '0.65rem', letterSpacing: '0.15em', padding: '3px 8px' }}
                >
                  {label}
                </span>
              </div>
            </FadeSlide>

            <FadeSlide visible={textVisible} delay={s(1)} xOffset={xText}>
              <h3 className="font-serif text-3xl font-bold leading-snug mb-4" style={{ color: '#1a4a3a' }}>
                {item.title}
              </h3>
            </FadeSlide>

            <FadeSlide visible={textVisible} delay={s(2)} xOffset={xText}>
              <div className="w-8 h-px bg-[#1a4a3a] mb-6" />
            </FadeSlide>

            <FadeSlide visible={textVisible} delay={s(3)} xOffset={xText}>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#333333', lineHeight: '1.8' }}>
                {item.description}
              </p>
            </FadeSlide>

            {item.authors && (
              <FadeSlide visible={textVisible} delay={s(4)} xOffset={xText}>
                <p className="italic" style={{ color: '#888', fontSize: '0.85rem', marginTop: '1.5rem' }}>
                  {item.authors}
                </p>
              </FadeSlide>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function FeaturedGallery({
  items,
  sectionLabel,
  title,
  subtitle,
}: {
  items: FeaturedGalleryItem[]
  sectionLabel: string
  title: string
  subtitle: string
}) {
  if (items.length === 0) return null

  return (
    <div>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-24 mb-16">
        <Reveal>
          <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">{subtitle}</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#0a0a0a] mb-4">{title}</h2>
          <div className="w-10 h-px bg-[#1a4a3a]" />
        </Reveal>
      </div>

      {items.map((item, i) => (
        <GallerySection
          key={item.id}
          item={item}
          imageLeft={i % 2 === 0}
          bg={i % 2 === 0 ? '#ffffff' : '#f3f4f6'}
          label={sectionLabel}
        />
      ))}
    </div>
  )
}
