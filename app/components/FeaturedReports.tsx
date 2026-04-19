'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FeaturedReport } from '@/lib/types'
import Reveal from './Reveal'
import PdfPreview from './PdfPreview'

// ── Shared intersection hook ──────────────────────────────────────────────────

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

// ── Staggered text item ───────────────────────────────────────────────────────

function FadeSlide({
  children,
  visible,
  delay,
  xOffset,
}: {
  children: ReactNode
  visible: boolean
  delay: number
  xOffset: number   // px — positive = starts to the right, negative = starts to the left
}) {
  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : `translateX(${xOffset}px)`,
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  )
}

// ── Single report section ─────────────────────────────────────────────────────

function ReportSection({
  report,
  imageLeft,
  bg,
}: {
  report: FeaturedReport
  imageLeft: boolean
  bg: string
}) {
  const { ref: pdfRef,  visible: pdfVisible  } = useInView(0.1)
  const { ref: textRef, visible: textVisible } = useInView(0.12)

  // Text slides in from its own side (toward centre)
  const xText = imageLeft ? 32 : -32   // text is on right → comes from right; left → from left

  const s = (n: number) => n * 80   // 80 ms stagger

  return (
    <section style={{ background: bg }} className="py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* ── PDF panel ── */}
          <div
            ref={pdfRef}
            className={imageLeft ? 'md:order-1' : 'md:order-2'}
            style={{
              opacity: pdfVisible ? 1 : 0,
              transform: pdfVisible ? 'scale(1)' : 'scale(0.97)',
              transition: 'opacity 800ms cubic-bezier(0.16,1,0.3,1) 100ms, transform 800ms cubic-bezier(0.16,1,0.3,1) 100ms',
              willChange: 'opacity, transform',
              boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
            }}
          >
            {report.pdf_url ? (
              <PdfPreview pdfUrl={report.pdf_url} title={report.title} />
            ) : (
              <div className="flex flex-col items-center justify-center bg-[#f5f5f5] gap-6 px-10 py-14">
                <div className="w-16 h-20 bg-white border border-black/10 flex flex-col items-center justify-center gap-1 shadow-sm">
                  <svg className="w-7 h-7 text-[#1a4a3a]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[9px] font-bold tracking-widest uppercase text-[#1a4a3a]/60">PDF</span>
                </div>
                <p className="font-serif text-base font-medium text-[#0a0a0a] text-center leading-snug max-w-[260px]">
                  {report.title}
                </p>
              </div>
            )}
          </div>

          {/* ── Text panel ── */}
          <div ref={textRef} className={`${imageLeft ? 'md:order-2' : 'md:order-1'}`}>

            {/* Badge */}
            <FadeSlide visible={textVisible} delay={s(0)} xOffset={xText}>
              <div className="mb-5">
                <span
                  className="inline-block text-white font-medium uppercase"
                  style={{
                    background: '#1a4a3a',
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    padding: '3px 8px',
                  }}
                >
                  Featured Report
                </span>
              </div>
            </FadeSlide>

            {/* Title */}
            <FadeSlide visible={textVisible} delay={s(1)} xOffset={xText}>
              <h3 className="font-serif text-3xl font-bold leading-snug mb-4" style={{ color: '#1a4a3a' }}>
                {report.title}
              </h3>
            </FadeSlide>

            {/* Decorative line */}
            <FadeSlide visible={textVisible} delay={s(2)} xOffset={xText}>
              <div className="w-8 h-px bg-[#1a4a3a] mb-6" />
            </FadeSlide>

            {/* Description */}
            <FadeSlide visible={textVisible} delay={s(3)} xOffset={xText}>
              <p className="text-sm leading-relaxed mb-4" style={{ color: '#333333', lineHeight: '1.8' }}>
                {report.description}
              </p>
            </FadeSlide>

            {/* Authors */}
            {report.authors && (
              <FadeSlide visible={textVisible} delay={s(4)} xOffset={xText}>
                <p
                  className="italic mb-8"
                  style={{ color: '#888', fontSize: '0.85rem', marginTop: '1.5rem' }}
                >
                  {report.authors}
                </p>
              </FadeSlide>
            )}
            {!report.authors && <div className="mb-8" />}

            {/* Download button */}
            {report.pdf_url && (
              <FadeSlide visible={textVisible} delay={report.authors ? s(5) : s(4)} xOffset={xText}>
                <a
                  href={report.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-white text-xs font-medium tracking-widest uppercase px-8 py-3.5"
                  style={{
                    background: '#1a4a3a',
                    transition: 'background 200ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2d6b54')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#1a4a3a')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Report
                </a>
              </FadeSlide>
            )}

          </div>
        </div>
      </div>
    </section>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function FeaturedReports({ reports }: { reports: FeaturedReport[] }) {
  if (reports.length === 0) return null

  return (
    <div>
      {/* Section title */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-24 mb-16">
        <Reveal>
          <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">In Evidence</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#0a0a0a] mb-4">
            Featured Reports
          </h2>
          <div className="w-10 h-px bg-[#1a4a3a]" />
        </Reveal>
      </div>

      {reports.map((report, i) => (
        <ReportSection
          key={report.id}
          report={report}
          imageLeft={i % 2 === 0}
          bg={i % 2 === 0 ? '#ffffff' : '#f3f4f6'}
        />
      ))}
    </div>
  )
}
