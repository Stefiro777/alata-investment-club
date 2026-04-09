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

  const titleLeft = index % 2 === 0
  const rowBg = index % 2 === 0 ? '#ffffff' : '#f9f9f9'

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

  const leftStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateX(-40px)',
    transition: 'opacity 650ms cubic-bezier(0.16,1,0.3,1) 0ms, transform 650ms cubic-bezier(0.16,1,0.3,1) 0ms',
  }
  const rightStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateX(40px)',
    transition: 'opacity 650ms cubic-bezier(0.16,1,0.3,1) 80ms, transform 650ms cubic-bezier(0.16,1,0.3,1) 80ms',
    borderLeft: '1px solid #e5e5e5',
  }

  const TitlePanel = () => (
    <div className="px-8 lg:px-14 py-16">
      {/* Step label */}
      <p
        style={{
          fontFamily: 'inherit',
          fontSize: '0.7rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#1a4a3a',
          opacity: 0.6,
          marginBottom: '0.75rem',
        }}
      >
        Step {step.number}
      </p>

      {/* Title */}
      <h3
        className="font-serif font-bold leading-tight"
        style={{ fontSize: '2.25rem', color: '#1a4a3a' }}
      >
        {step.title}
      </h3>

      {/* Decorative line */}
      <div style={{ width: '2rem', height: '1px', background: '#1a4a3a', marginTop: '1.25rem' }} />
    </div>
  )

  const DescPanel = () => (
    <div className="px-8 lg:px-14 py-16">
      {/* Description */}
      <p
        className="leading-relaxed mb-6"
        style={{ fontSize: '1rem', color: '#444444', maxWidth: '28rem' }}
      >
        {step.description}
      </p>

      {/* Skills */}
      <div className="flex flex-wrap gap-2">
        {step.skills.map(skill => (
          <span
            key={skill}
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
              padding: '0.25rem 0.75rem',
              border: '1px solid #1a4a3a',
              color: '#1a4a3a',
              background: 'transparent',
            }}
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
          <span
            style={{
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#9ca3af',
            }}
          >
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
  )

  return (
    <div ref={ref} style={{ background: rowBg }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row">

        <div className="w-full md:w-1/2" style={leftStyle}>
          {titleLeft ? <TitlePanel /> : <DescPanel />}
        </div>

        <div className="w-full md:w-1/2" style={rightStyle}>
          {titleLeft ? <DescPanel /> : <TitlePanel />}
        </div>

      </div>
    </div>
  )
}

export default function TimelineSection() {
  return (
    <section>
      {steps.map((step, i) => (
        <PhaseRow key={step.number} step={step} index={i} />
      ))}
    </section>
  )
}
