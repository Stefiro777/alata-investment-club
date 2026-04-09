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

function PhaseRow({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  const textLeft = index % 2 === 0
  const textBg = index % 2 === 0 ? '#ffffff' : '#f9f9f9'

  // Text slides in from its side, deco slides from opposite side
  const textSlide = textLeft ? -48 : 48
  const decoSlide = textLeft ? 48 : -48
  const delay = index * 100

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.08 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={ref} className="grid md:grid-cols-2" style={{ minHeight: 400 }}>

      {/* ── Text panel ── */}
      <div
        className={`flex flex-col justify-center px-10 lg:px-16 py-16 ${textLeft ? 'md:order-1' : 'md:order-2'}`}
        style={{
          background: textBg,
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : `translateX(${textSlide}px)`,
          transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        }}
      >
        <p className="text-xs tracking-widest uppercase mb-4" style={{ color: '#9ca3af' }}>
          Step {step.number}
        </p>

        {/* Number + Title inline */}
        <div className="flex items-baseline gap-3 mb-1">
          <span
            className="font-serif font-bold leading-none select-none"
            style={{ fontSize: '3.5rem', color: '#1a4a3a', opacity: 0.15, lineHeight: 1 }}
          >
            {step.number}
          </span>
          <h3 className="font-serif text-2xl font-bold" style={{ color: '#1a4a3a' }}>
            {step.title}
          </h3>
        </div>

        <div className="w-8 h-px my-5" style={{ background: '#1a4a3a' }} />

        <p className="text-sm leading-relaxed mb-6" style={{ color: '#374151' }}>
          {step.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-2">
          {step.skills.map(skill => (
            <span
              key={skill}
              className="text-xs px-3 py-1"
              style={{ border: '1px solid #1a4a3a', color: '#1a4a3a' }}
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Partner (step 02) */}
        {step.partner && (
          <div
            className="flex items-center gap-4 mt-6 pt-5"
            style={{ borderTop: '1px solid #e5e7eb' }}
          >
            <span className="text-xs tracking-widest uppercase" style={{ color: '#9ca3af' }}>
              In partnership with Syrto
            </span>
            <Image
              src={step.partner.src}
              alt="Syrto"
              width={110}
              height={36}
              className="object-contain h-9 w-auto"
            />
          </div>
        )}
      </div>

      {/* ── Decorative panel ── */}
      <div
        className={`relative flex items-center justify-center overflow-hidden ${textLeft ? 'md:order-2' : 'md:order-1'}`}
        style={{
          background: '#1a4a3a',
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : `translateX(${decoSlide}px)`,
          transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay + 80}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay + 80}ms`,
          minHeight: 300,
        }}
      >
        <span
          className="font-serif font-bold select-none pointer-events-none absolute"
          style={{
            fontSize: 'clamp(9rem, 16vw, 14rem)',
            color: 'rgba(255,255,255,0.06)',
            lineHeight: 1,
          }}
        >
          {step.number}
        </span>
      </div>

    </div>
  )
}

export default function TimelineSection() {
  return (
    <section>

      {/* Section header */}
      <div className="bg-white py-16 px-6">
        <div className="max-w-7xl mx-auto px-0 lg:px-8">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#9ca3af' }}>The Process</p>
          <h2 className="font-serif text-4xl font-bold" style={{ color: '#0a0a0a' }}>Your Path at Alata</h2>
          <div className="w-10 h-px mt-4" style={{ background: '#1a4a3a' }} />
        </div>
      </div>

      {steps.map((step, i) => (
        <PhaseRow key={step.number} step={step} index={i} />
      ))}

    </section>
  )
}
