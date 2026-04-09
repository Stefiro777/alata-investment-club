'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  pdfUrl: string
  title: string
}

// Static fallback box shown on load failure
function PdfFallback({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-[#f5f5f5] w-full h-full gap-6 px-10 py-14">
      <div className="w-16 h-20 bg-white border border-black/10 flex flex-col items-center justify-center gap-1 shadow-sm flex-shrink-0">
        <svg className="w-7 h-7 text-[#1a4a3a]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-[9px] font-bold tracking-widest uppercase text-[#1a4a3a]/60">PDF</span>
      </div>
      <p className="font-serif text-base font-medium text-[#0a0a0a] text-center leading-snug max-w-[260px]">
        {title}
      </p>
    </div>
  )
}

export default function PdfPreview({ pdfUrl, title }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const renderPage = useCallback(async (pdf: any, pageNum: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch {}
      renderTaskRef.current = null
    }

    try {
      const page = await pdf.getPage(pageNum)
      const containerWidth = containerRef.current?.clientWidth ?? 600
      const baseViewport = page.getViewport({ scale: 1 })
      const scale = containerWidth / baseViewport.width
      const viewport = page.getViewport({ scale })

      canvas.width = viewport.width
      canvas.height = viewport.height

      const ctx = canvas.getContext('2d')!
      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
    } catch (err: any) {
      // 'RenderingCancelledException' is normal on fast navigation
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[PdfPreview] render error:', err)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(false)

        // Dynamic import to avoid SSR issues
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`

        const pdf = await pdfjsLib.getDocument({
          url: pdfUrl,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
        }).promise

        if (cancelled) return
        pdfRef.current = pdf
        setTotalPages(pdf.numPages)
        setCurrentPage(1)
        await renderPage(pdf, 1)
      } catch (err) {
        if (!cancelled) {
          console.error('[PdfPreview] load error:', err)
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [pdfUrl, renderPage])

  useEffect(() => {
    if (pdfRef.current && totalPages > 0) {
      renderPage(pdfRef.current, currentPage)
    }
  }, [currentPage, totalPages, renderPage])

  if (error) return <PdfFallback title={title} />

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-[#f5f5f5]">

      {/* ── Navigation bar ── */}
      {(totalPages > 1 || loading) && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-black/10 flex-shrink-0">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1 || loading}
            aria-label="Pagina precedente"
            className="w-7 h-7 flex items-center justify-center text-[#1a4a3a] disabled:opacity-25 hover:bg-[#f3f4f6] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-[11px] font-medium tracking-wide text-[#6b7280]">
            {loading ? '…' : `${currentPage} / ${totalPages}`}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages || loading}
            aria-label="Pagina successiva"
            className="w-7 h-7 flex items-center justify-center text-[#1a4a3a] disabled:opacity-25 hover:bg-[#f3f4f6] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Canvas area ── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Loading skeleton */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f5f5f5] gap-4">
            <div className="w-8 h-8 border-2 border-[#1a4a3a]/20 border-t-[#1a4a3a] rounded-full animate-spin" />
            <span className="text-xs text-[#9ca3af] tracking-wide">Caricamento PDF…</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ display: loading ? 'none' : 'block' }}
        />
      </div>

    </div>
  )
}
