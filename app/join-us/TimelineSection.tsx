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
  const isDark = index === 1

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
      className="relative pl-16 pb-14 last:pb-0"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        transitionDelay: `${index * 160}ms`,
      }}
    >
      {/* Node circle on the line */}
      <div
        className="absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center z-10"
        style={{
          background: isDark ? 'white' : '#1a4a3a',
          outline: '2px solid #1a4a3a',
          outlineOffset: '3px',
        }}
      >
        <span
          className="font-serif text-sm font-bold"
          style={{ color: isDark ? '#1a4a3a' : 'white' }}
        >
          {step.number}
        </span>
      </div>

      {/* Content card */}
      <div
        className="p-8"
        style={{
          background: isDark ? '#1a4a3a' : 'white',
          border: isDark ? 'none' : '1px solid #e5e7eb',
          borderLeft: isDark ? 'none' : '3px solid #1a4a3a',
        }}
      >
        {/* Eyebrow + title */}
        <p
          className="text-xs tracking-widest uppercase mb-2"
          style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#9ca3af' }}
        >
          Step {step.number}
        </p>
        <h3
          className="font-serif text-2xl font-bold mb-3"
          style={{ color: isDark ? 'white' : '#0a0a0a' }}
        >
          {step.title}
        </h3>
        <div
          className="w-8 h-px mb-5"
          style={{ background: isDark ? 'rgba(255,255,255,0.25)' : '#1a4a3a' }}
        />

        {/* Description */}
        <p
          className="text-sm leading-relaxed mb-7"
          style={{ color: isDark ? 'rgba(255,255,255,0.72)' : '#374151' }}
        >
          {step.description}
        </p>

        {/* Skills */}
        <div>
          <p
            className="text-xs tracking-widest uppercase mb-3"
            style={{ color: isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af' }}
          >
            Skills
          </p>
          <div className="flex flex-wrap gap-2">
            {step.skills.map(skill => (
              <span
                key={skill}
                className="text-xs px-3 py-1 rounded-full"
                style={
                  isDark
                    ? { border: '1px solid rgba(255,255,255,0.22)', color: 'rgba(255,255,255,0.78)' }
                    : { border: '1px solid #1a4a3a', color: '#1a4a3a' }
                }
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Partner banner (step 02) — bottom of card */}
        {step.partner && (
          <div className="flex items-center justify-between gap-3 mt-6 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
            <span className="text-xs tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>
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
  )
}

export default function TimelineSection() {
  return (
    <section className="relative py-24 px-6 overflow-hidden" style={{ background: '#f9f9f7' }}>
      {/* Background image — very low opacity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/piazzavittoria.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%',
          opacity: 0.17,
          mixBlendMode: 'multiply',
          filter: 'grayscale(100%)',
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto">

        {/* Section header */}
        <div className="mb-16">
          <p className="text-xs tracking-widest uppercase text-[#9ca3af] mb-3">The Process</p>
          <h2 className="font-serif text-4xl font-bold text-[#0a0a0a]">Your Path at Alata</h2>
          <div className="w-10 h-px bg-[#1a4a3a] mt-4" />
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-5 w-px bg-[#1a4a3a]/20" style={{ bottom: '0' }} />

          {steps.map((step, i) => (
            <TimelineItem key={step.number} step={step} index={i} />
          ))}
        </div>

      </div>
    </section>
  )
}
