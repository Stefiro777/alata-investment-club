'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  pdfUrl: string
  title: string
}

function PdfFallback({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-[#f5f5f5] w-full gap-6 px-10 py-14">
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
  const [expanded, setExpanded] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(0)

  const renderPage = useCallback(async (pdf: any, pageNum: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
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
      setCanvasHeight(viewport.height)
      const ctx = canvas.getContext('2d')!
      const task = page.render({ canvasContext: ctx, viewport })
      renderTaskRef.current = task
      await task.promise
    } catch (err: any) {
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

  // collapsed → top 50%, expanded → full height, loading → fixed placeholder
  const containerHeight = loading || canvasHeight === 0
    ? 260
    : expanded
      ? canvasHeight
      : Math.floor(canvasHeight * 0.5)

  return (
    <div ref={containerRef} className="w-full bg-[#f5f5f5]">

      {/* ── Navigation bar — only when expanded ── */}
      {expanded && !loading && (
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-black/10">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            aria-label="Pagina precedente"
            className="w-7 h-7 flex items-center justify-center text-[#1a4a3a] disabled:opacity-25 hover:bg-[#f3f4f6] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-[11px] font-medium tracking-wide text-[#6b7280]">
            {currentPage} / {totalPages}
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Pagina successiva"
              className="w-7 h-7 flex items-center justify-center text-[#1a4a3a] disabled:opacity-25 hover:bg-[#f3f4f6] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Chiudi"
              className="w-7 h-7 flex items-center justify-center text-[#6b7280] hover:text-[#0a0a0a] hover:bg-[#f3f4f6] transition-colors ml-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Canvas container — height animates on expand/collapse ── */}
      <div
        className="relative overflow-hidden"
        style={{
          height: `${containerHeight}px`,
          transition: loading || canvasHeight === 0 ? 'none' : 'height 400ms ease',
          cursor: !expanded && !loading ? 'pointer' : 'default',
        }}
        onClick={() => { if (!expanded && !loading && canvasHeight > 0) setExpanded(true) }}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f5f5f5] gap-4">
            <div className="w-8 h-8 border-2 border-[#1a4a3a]/20 border-t-[#1a4a3a] rounded-full animate-spin" />
            <span className="text-xs text-[#9ca3af] tracking-wide">Caricamento PDF…</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ visibility: loading ? 'hidden' : 'visible' }}
        />
      </div>

      {/* ── "Click to expand" hint — only when collapsed and loaded ── */}
      {!loading && !expanded && canvasHeight > 0 && (
        <div
          className="flex items-center justify-center gap-1.5 py-2.5 bg-[#f5f5f5] border-t border-black/5 cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <svg className="w-3 h-3 text-[#aaa]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span style={{ fontSize: '0.7rem', color: '#888', letterSpacing: '0.05em' }}>
            Click to expand
          </span>
        </div>
      )}

    </div>
  )
}
