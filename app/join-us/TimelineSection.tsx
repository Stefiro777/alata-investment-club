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

function TimelineItem({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="relative"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        transitionDelay: `${index * 120}ms`,
      }}
    >
      {/* Step number — large serif, outside the card */}
      <div className="flex items-start gap-8 mb-0">
        <div className="flex-shrink-0 w-16 pt-8 text-right">
          <span
            className="font-serif font-bold leading-none select-none"
            style={{ fontSize: '4rem', color: 'rgba(247,245,240,0.18)', lineHeight: 1 }}
          >
            {step.number}
          </span>
        </div>

        {/* Card */}
        <div
          className="flex-1 mb-10 last:mb-0"
          style={{
            background: '#f7f5f0',
            borderLeft: '3px solid rgba(247,245,240,0.35)',
          }}
        >
          {/* Card inner */}
          <div className="p-8">
            {/* Eyebrow */}
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#9ca3af' }}>
              Step {step.number}
            </p>

            {/* Title */}
            <h3 className="font-serif text-2xl font-bold mb-3" style={{ color: '#1a4a3a' }}>
              {step.title}
            </h3>

            {/* Divider */}
            <div className="w-8 h-px mb-5" style={{ background: '#1a4a3a' }} />

            {/* Description */}
            <p className="text-sm leading-relaxed mb-7" style={{ color: '#374151' }}>
              {step.description}
            </p>

            {/* Skills */}
            <div>
              <p className="text-xs tracking-widest uppercase mb-3" style={{ color: '#9ca3af' }}>
                Skills
              </p>
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
            </div>

            {/* Partner banner (step 02) */}
            {step.partner && (
              <div
                className="flex items-center justify-between gap-3 mt-6 pt-6"
                style={{ borderTop: '1px solid #e5e7eb' }}
              >
                <span className="text-xs tracking-widest uppercase" style={{ color: '#9ca3af' }}>
                  In partnership with Syrto — Financial Intelligence
                </span>
                <Image
                  src={step.partner.src}
                  alt="Syrto"
                  width={130}
                  height={40}
                  className="object-contain h-10 w-auto"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connector line between steps */}
      {index < steps.length - 1 && (
        <div
          className="absolute"
          style={{
            left: '4rem',
            top: 'calc(100% - 2.5rem)',
            width: '1px',
            height: '2.5rem',
            background: 'rgba(247,245,240,0.2)',
          }}
        />
      )}
    </div>
  )
}

export default function TimelineSection() {
  return (
    <section className="py-24 px-6" style={{ background: '#1a4a3a' }}>
      <div className="max-w-3xl mx-auto">

        {/* Section header */}
        <div className="mb-16">
          <p className="text-xs tracking-widest uppercase mb-3" style={{ color: 'rgba(247,245,240,0.45)' }}>
            The Process
          </p>
          <h2 className="font-serif text-4xl font-bold" style={{ color: '#f7f5f0' }}>
            Your Path at Alata
          </h2>
          <div className="w-10 h-px mt-4" style={{ background: 'rgba(247,245,240,0.35)' }} />
        </div>

        {/* Timeline */}
        <div className="relative">
          {steps.map((step, i) => (
            <TimelineItem key={step.number} step={step} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
