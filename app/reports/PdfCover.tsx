'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * First page of a report's PDF drawn on the cover. The PDF is only fetched once
 * the cover is close to the screen; until then, and if the file is missing or
 * unreadable, the typographic cover passed as `fallback` stays in place.
 */
export default function PdfCover({ pdfUrl, className = '', fallback }: { pdfUrl: string; className?: string; fallback: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [near, setNear] = useState(false)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { rootMargin: '300px' })
    io.observe(box)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!near) return
    let cancelled = false
    let task: { cancel: () => void } | null = null
    let doc: { destroy: () => Promise<void> } | null = null
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`
        const loading = pdfjs.getDocument({ url: pdfUrl, cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`, cMapPacked: true })
        doc = loading
        const pdf = await loading.promise
        const page = await pdf.getPage(1)
        const canvas = canvasRef.current
        const box = boxRef.current
        if (cancelled || !canvas || !box) return
        const base = page.getViewport({ scale: 1 })
        const scale = (box.clientWidth / base.width) * Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        const render = page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport })
        task = render
        await render.promise
        if (!cancelled) setDrawn(true)
      } catch {
        // missing or unreadable file: the typographic cover stays
      }
    })()
    return () => {
      cancelled = true
      try { task?.cancel() } catch { /* already done */ }
      void doc?.destroy().catch(() => {})
    }
  }, [near, pdfUrl])

  return (
    <div ref={boxRef} className={`relative overflow-hidden bg-moss ${className}`}>
      {!drawn && fallback}
      <canvas
        ref={canvasRef}
        aria-hidden
        className={`absolute inset-0 h-full w-full object-contain object-center transition-opacity duration-500 ${drawn ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}
