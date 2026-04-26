'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface Props {
  pdfUrl: string
  title: string
}

function PdfFallback({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-paper-stone w-full gap-6 px-10 py-14">
      <div className="w-16 h-20 bg-white border border-line-faint flex flex-col items-center justify-center gap-1 shadow-sm flex-shrink-0">
        <svg className="w-7 h-7 text-forest/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-[9px] font-bold tracking-widest uppercase text-forest/60">PDF</span>
      </div>
      <p className="font-serif text-base font-medium text-ink-900 text-center leading-snug max-w-[260px]">
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
  // Incremented each time a new PDF is ready to render; drives the render effect.
  const [pdfReady, setPdfReady] = useState(0)

  const renderPage = useCallback(async (pdf: any, pageNum: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Cancel any in-flight render and wait for it to actually stop before
    // touching the canvas again — this is what prevents the double-render crash.
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel()
        await renderTaskRef.current.promise
      } catch {
        // RenderingCancelledException is expected; swallow it.
      }
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
      renderTaskRef.current = null
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('[PdfPreview] render error:', err)
      }
    }
  }, [])

  // Load the PDF document. Does NOT call renderPage directly — state updates
  // batch together and the render effect below owns all rendering.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(false)
        setPdfReady(0)
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
        setPdfReady(v => v + 1) // signals the render effect to run
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
    return () => {
      cancelled = true
      // Cancel any in-flight render when the URL changes or component unmounts.
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch {}
        renderTaskRef.current = null
      }
    }
  }, [pdfUrl])

  // Single effect responsible for all rendering. Runs when the PDF becomes
  // ready (pdfReady bumped) or when the user navigates pages (currentPage).
  useEffect(() => {
    if (!pdfReady || !pdfRef.current) return
    renderPage(pdfRef.current, currentPage)
  }, [currentPage, pdfReady, renderPage])

  if (error) return <PdfFallback title={title} />

  // collapsed → top 50%, expanded → full height, loading → fixed placeholder
  const containerHeight = loading || canvasHeight === 0
    ? 260
    : expanded
      ? canvasHeight
      : Math.floor(canvasHeight * 0.5)

  // Shared arrow button style (carousel-style, no border-radius)
  const arrowBase: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid #1a4a3a',
    color: '#1a4a3a',
    cursor: 'pointer',
    zIndex: 10,
    transition: 'background 150ms, color 150ms',
  }

  return (
    <div ref={containerRef} className="w-full bg-paper-stone">

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
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper-stone gap-4">
            <div className="w-8 h-8 border-2 border-forest/20 border-t-[#1a4a3a] rounded-full animate-spin" />
            <span className="text-xs text-ink-400 tracking-wide">Caricamento PDF…</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full block"
          style={{ visibility: loading ? 'hidden' : 'visible' }}
        />

        {/* ── Prev / Next arrows — absolute, centred vertically, expanded only ── */}
        {expanded && !loading && totalPages > 1 && (
          <>
            <button
              onClick={e => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)) }}
              disabled={currentPage <= 1}
              aria-label="Pagina precedente"
              style={{ ...arrowBase, left: 12, opacity: currentPage <= 1 ? 0.3 : 1 }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={e => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)) }}
              disabled={currentPage >= totalPages}
              aria-label="Pagina successiva"
              style={{ ...arrowBase, right: 12, opacity: currentPage >= totalPages ? 0.3 : 1 }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* ── Close (X) + page indicator — top-right, expanded only ── */}
        {expanded && !loading && (
          <div
            className="absolute top-3 right-3 flex items-center gap-2"
            style={{ zIndex: 10 }}
            onClick={e => e.stopPropagation()}
          >
            {totalPages > 1 && (
              <span
                className="text-[10px] font-medium text-ink-500 bg-white/90 px-2 py-1"
                style={{ border: '1px solid rgba(0,0,0,0.08)' }}
              >
                {currentPage} / {totalPages}
              </span>
            )}
            <button
              onClick={() => setExpanded(false)}
              aria-label="Chiudi"
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(0,0,0,0.12)',
                color: '#6b7280',
                cursor: 'pointer',
              }}
            >
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── "EXPAND REPORT" bar — collapsed and loaded only ── */}
      {!loading && !expanded && canvasHeight > 0 && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            height: 32,
            background: '#1a4a3a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Expand Report
          </span>
          <svg width="10" height="10" fill="none" stroke="white" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}

    </div>
  )
}
