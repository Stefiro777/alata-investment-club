'use client'

import { useCallback, useEffect, useState } from 'react'

/** Full-screen photo viewer on the night ground. Arrows, Escape, swipe-free. */
export default function Lightbox({
  photos,
  start = 0,
  title,
  onClose,
}: {
  photos: string[]
  start?: number
  title?: string
  onClose: () => void
}) {
  const [i, setI] = useState(start)
  const prev = useCallback(() => setI(v => (v - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setI(v => (v + 1) % photos.length), [photos.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, prev, next])

  if (photos.length === 0) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={title ?? 'Photos'} className="fixed inset-0 z-[300] flex flex-col bg-night text-ivory">
      <div className="rd-gutter flex items-center justify-between py-6">
        <span className="rd-italic text-[20px] md:text-[24px]">{title}</span>
        <button type="button" onClick={onClose} className="text-[13px] font-medium tracking-[0.04em] hover:underline underline-offset-[6px]">
          Close
        </button>
      </div>
      <div className="relative min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photos[i]} alt="" className="absolute inset-0 m-auto max-h-full max-w-full object-contain" />
        {photos.length > 1 && (
          <>
            <button type="button" onClick={prev} aria-label="Previous photo" className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize" />
            <button type="button" onClick={next} aria-label="Next photo" className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize" />
          </>
        )}
      </div>
      <div className="rd-gutter flex items-center justify-between py-6 text-[13px] text-ivory/70">
        <button type="button" onClick={prev} className="rd-italic text-[22px] text-ivory disabled:opacity-30" disabled={photos.length < 2}>Previous</button>
        <span>{i + 1} / {photos.length}</span>
        <button type="button" onClick={next} className="rd-italic text-[22px] text-ivory disabled:opacity-30" disabled={photos.length < 2}>Next</button>
      </div>
    </div>
  )
}
