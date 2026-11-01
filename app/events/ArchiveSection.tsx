'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Lightbox from '@/app/components/site/Lightbox'
import { longDate, shortDate } from '@/lib/event-display'

export type ArchiveItem = {
  key: string
  date: string
  title: string
  kind: string | null
  photo: string | null
  /** Past club events open their page; news-style event cards open a sheet. */
  href: string | null
  description?: string | null
  photos?: string[]
}

const FIRST = 10

/** Board Ev5: the minor events as a typographic list; a photo appears on hover. */
export default function ArchiveSection({ items }: { items: ArchiveItem[] }) {
  const [showAll, setShowAll] = useState(false)
  const [hover, setHover] = useState<ArchiveItem | null>(null)
  const [sheet, setSheet] = useState<ArchiveItem | null>(null)
  const [photos, setPhotos] = useState<string[] | null>(null)
  const reduced = useReducedMotion()

  const visible = showAll ? items : items.slice(0, FIRST)
  const half = Math.ceil(visible.length / 2)
  const columns = [visible.slice(0, half), visible.slice(half)]

  function renderRow(item: ArchiveItem) {
    const inner = (
      <>
        <span className="rd-display text-[26px] leading-none">{shortDate(item.date)}</span>
        <span className="text-[16px] leading-[1.3]">{item.title}</span>
        <span className="justify-self-end text-[10px] font-semibold uppercase tracking-[0.14em] text-earth-500">{item.kind}</span>
      </>
    )
    const cls = 'grid grid-cols-[78px_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-night/20 pb-[18px] pt-5 text-left transition-colors hover:bg-night/[0.03] w-full'
    const events = {
      onMouseEnter: () => setHover(item),
      onMouseLeave: () => setHover(h => (h?.key === item.key ? null : h)),
      onFocus: () => setHover(item),
      onBlur: () => setHover(null),
    }
    return item.href
      ? <Link href={item.href} className={cls} {...events}>{inner}</Link>
      : <button type="button" className={cls} onClick={() => setSheet(item)} {...events}>{inner}</button>
  }

  return (
    <section id="archive" className="relative bg-ivory py-[clamp(72px,10vw,110px)] text-night">
      <div className="rd-gutter">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="rd-display text-[clamp(48px,6vw,72px)]">The <em>archive</em></h2>
          {items.length > FIRST && (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              className="rd-italic text-[clamp(22px,2.3vw,28px)] hover:underline underline-offset-[0.18em]"
            >
              {showAll ? 'Fewer past events' : 'All past events'}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <p className="rd-italic mt-10 text-[26px] text-earth-700">The first stories are still being written.</p>
        ) : (
          <div className="relative mt-10 grid gap-x-10 md:mt-[64px] md:grid-cols-2">
            {columns.map((col, c) => (
              <ul key={c} className={`border-t border-night ${c === 1 ? 'border-t-0 md:border-t' : ''}`}>
                {col.map(item => <li key={item.key}>{renderRow(item)}</li>)}
              </ul>
            ))}

            {/* Hover photo, desktop only */}
            <AnimatePresence>
              {hover?.photo && (
                <motion.div
                  key={hover.key}
                  initial={reduced ? false : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="pointer-events-none absolute left-1/2 top-[-40px] z-10 hidden h-[300px] w-[230px] -translate-x-1/2 overflow-hidden bg-sand shadow-[0_24px_60px_-20px_rgba(11,29,22,0.45)] lg:block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hover.photo} alt="" className="h-full w-full object-cover" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {sheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={sheet.title}
          className="fixed inset-0 z-[250] flex justify-end bg-night/50"
          onClick={e => { if (e.target === e.currentTarget) setSheet(null) }}
        >
          <div className="h-full w-full max-w-[600px] overflow-y-auto bg-ivory px-[clamp(24px,5vw,64px)] py-12 text-night">
            <div className="flex items-baseline justify-between gap-6">
              <div className="text-[13px] text-earth-700">{longDate(sheet.date)}{sheet.kind ? ` · ${sheet.kind}` : ''}</div>
              <button type="button" onClick={() => setSheet(null)} className="text-[13px] font-medium hover:underline underline-offset-[6px]">Close</button>
            </div>
            <h3 className="rd-display mt-4 text-[clamp(34px,4vw,48px)]">{sheet.title}</h3>
            {sheet.description && <p className="mt-6 whitespace-pre-line text-[15px] leading-[1.7] text-earth-700">{sheet.description}</p>}
            {sheet.photos && sheet.photos.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-3">
                {sheet.photos.map((src, i) => (
                  <button key={src} type="button" onClick={() => setPhotos(sheet.photos!.slice(i).concat(sheet.photos!.slice(0, i)))} className="aspect-[4/5] overflow-hidden bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {photos && <Lightbox photos={photos} title={sheet?.title} onClose={() => setPhotos(null)} />}
    </section>
  )
}
