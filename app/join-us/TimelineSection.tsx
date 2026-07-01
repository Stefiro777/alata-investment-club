'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

type Step = {
  number: string
  title: string
  description: string
  skills: string[]
  partner?: { src: string; name: string }
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Academy',
    description:
      'The Academy is the entry point into Alata Investment Club. Through a series of progressive tests covering accounting, valuation, macroeconomics and financial markets, candidates develop the foundational skills needed to contribute to the club. No prior experience required — curiosity, commitment and rigour are enough.',
    skills: ['Accounting', 'Financial Valuation', 'Macroeconomics', 'Financial Markets', 'Investment Analysis'],
  },
  {
    number: '02',
    title: 'Syrto Research Group',
    description:
      "Candidates who complete the Academy join the Syrto Research Group, our junior research group developed in partnership with Syrto — a financial intelligence startup. Members use Syrto's proprietary software to conduct advanced financial analysis powered by Knowledge Graphs, Neural Networks and Machine Learning.",
    skills: ['Knowledge Graphs', 'Neural Networks', 'Machine Learning', 'Financial Modelling', 'AI-Driven Analysis'],
    partner: { src: '/syrto2.jpeg', name: 'Syrto — Financial Intelligence' },
  },
  {
    number: '03',
    title: 'Lab & Research',
    description:
      'The most promising members progress to our Lab & Research group, the operational core of Alata Investment Club. Here, members produce equity research, M&A analysis, macroeconomic reports and earnings breakdowns — all published on our LinkedIn page and shared with our community.',
    skills: ['Equity Research', 'M&A Analysis', 'Macro Reports', 'Earnings Breakdowns', 'Report Writing'],
  },
]

function StepBlock({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const left = index % 2 === 0 // content column on desktop: even → left, odd → right

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const contentStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : `translateX(${left ? -32 : 32}px)`,
    transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1) 120ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 120ms',
  }

  return (
    <div ref={ref} className="relative md:grid md:grid-cols-2 md:gap-0">
      {/* Node on the line */}
      <div
        className="absolute left-6 md:left-1/2 top-0 -translate-x-1/2 z-10"
        style={{
          opacity: visible ? 1 : 0,
          transform: `translateX(-50%) scale(${visible ? 1 : 0.6})`,
          transition: 'opacity 500ms ease, transform 500ms cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        <div className="w-14 h-14 bg-white border border-forest flex items-center justify-center">
          <span className="font-serif text-xl font-semibold text-forest">{step.number}</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={`pl-20 pr-6 md:px-0 pt-1 ${left ? 'md:col-start-1 md:pr-20 md:text-right' : 'md:col-start-2 md:pl-20'}`}
        style={contentStyle}
      >
        <p className="text-[11px] tracking-[0.25em] uppercase text-forest/60 mb-3">Step {step.number}</p>
        <h3 className="font-serif text-3xl sm:text-4xl font-bold text-forest leading-tight mb-5">{step.title}</h3>
        <div className={`w-8 h-px bg-forest mb-5 ${left ? 'md:ml-auto' : ''}`} />
        <p className="text-ink-500 text-base leading-relaxed">{step.description}</p>

        <div className={`flex flex-wrap gap-2 mt-6 ${left ? 'md:justify-end' : ''}`}>
          {step.skills.map(skill => (
            <span
              key={skill}
              className="text-[11px] tracking-wide px-3 py-1 border border-forest text-forest bg-transparent"
            >
              {skill}
            </span>
          ))}
        </div>

        {step.partner && (
          <div className={`flex items-center gap-4 mt-7 pt-5 border-t border-line ${left ? 'md:justify-end' : ''}`}>
            <span className="text-[11px] tracking-[0.15em] uppercase text-ink-400">
              In partnership with Syrto
            </span>
            <Image
              src={step.partner.src}
              alt="Syrto"
              width={100}
              height={32}
              className="object-contain h-8 w-auto"
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function TimelineSection() {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  // Progress line draws as the timeline scrolls through the viewport
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const rect = el.getBoundingClientRect()
      const anchor = window.innerHeight * 0.65
      const p = (anchor - rect.top) / rect.height
      setProgress(Math.min(1, Math.max(0, p)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="bg-white py-24 sm:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-20 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-ink-400 mb-4">Membership Path</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-5">
            From Academy to Research
          </h2>
          <div className="w-10 h-px bg-forest mx-auto" />
        </div>

        {/* Timeline track */}
        <div ref={trackRef} className="relative">
          {/* Base line + progress fill */}
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-line -translate-x-1/2">
            <div
              className="absolute top-0 left-0 w-full bg-forest"
              style={{ height: `${progress * 100}%` }}
            />
          </div>

          <div className="flex flex-col gap-24">
            {steps.map((step, i) => (
              <StepBlock key={step.number} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
