'use client'

import { useEffect, useRef, useState } from 'react'

type SubTeam = {
  name: string
  color: string
  skills: string[]
  /** Marks copy that is a generic placeholder pending refinement — surfaced
   * in the UI itself so it isn't mistaken for final content. */
  placeholder?: boolean
}

type Step = {
  number: string
  title: string
  description: string
  skills: string[]
  color?: string
  feeNote?: string
  subTeams?: SubTeam[]
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Academy',
    description:
      'Academy is the entry point into Alata Investment Club, open to every new member. It rewards commitment and the drive to grow — not prior experience. Through a progressive path covering accounting, valuation, macroeconomics and financial markets, candidates build the foundations needed to contribute to the club.',
    skills: ['Accounting', 'Financial Valuation', 'Macroeconomics', 'Financial Markets', 'Investment Analysis'],
  },
  {
    number: '02',
    title: 'Gruppo',
    description:
      "Moving from Academy into a core Gruppo requires a membership fee that directly funds the club's activities and events. From here, members freely choose a core team — with rotation possible at any time — while Events and Media stay open in parallel to everyone.",
    skills: [],
    feeNote: '€15 membership fee — funds Club activities and events',
    subTeams: [
      {
        name: 'Equity Research',
        color: '#1a4a3a',
        skills: ['Company Analysis', 'Equity Reports', 'Valuation', 'Learning by Doing'],
      },
      {
        name: 'M&A',
        color: '#1a4a3a',
        skills: ['Investment Banking Standards', 'PowerPoint Decks', 'Comps / DCF / Precedent Transactions in Excel', 'Precision & Method'],
      },
      {
        name: 'Macro',
        color: '#1a4a3a',
        skills: ['Macroeconomic Analysis', 'Market Commentary'],
        placeholder: true,
      },
      {
        name: 'Events',
        color: '#1d4ed8',
        skills: ['End-to-End Event Management', 'Sponsor Relations', 'Guest Relations'],
      },
      {
        name: 'Media',
        color: '#4b5320',
        skills: ['Content Creation', 'Social Media Management'],
      },
    ],
  },
  {
    number: '03',
    title: 'Alumni',
    description:
      'Alumni is reserved for the most deserving members, evaluated on both their path within the club and their achievements beyond it. It is an internal community and network of excellence that lasts well beyond a member\'s time at Alata.',
    skills: ['Internal & External Excellence Evaluation', 'Alumni Network', 'Lifelong Community'],
    color: '#6ca0dc',
  },
]

function SubTeamCard({ team }: { team: SubTeam }) {
  return (
    <div className="border border-line-faint p-4">
      <span
        className="inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-1 mb-3"
        style={{ background: team.color, color: '#fff' }}
      >
        {team.name}
      </span>
      {team.placeholder && (
        <p className="text-[10px] uppercase tracking-wide text-ink-400 italic mb-2">Placeholder copy — to refine</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {team.skills.map(skill => (
          <span key={skill} className="text-[10px] tracking-wide px-2 py-0.5 border border-forest/40 text-forest">
            {skill}
          </span>
        ))}
      </div>
    </div>
  )
}

function StepBlock({ step, index }: { step: Step; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const left = index % 2 === 0 // content column on desktop: even → left, odd → right
  const nodeColor = step.color ?? '#1a4a3a'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.2 }
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
        <div className="w-14 h-14 bg-white border flex items-center justify-center" style={{ borderColor: nodeColor }}>
          <span className="font-serif text-xl font-semibold" style={{ color: nodeColor }}>{step.number}</span>
        </div>
      </div>

      {/* Content */}
      <div
        className={`pl-20 pr-6 md:px-0 pt-1 ${left ? 'md:col-start-1 md:pr-20 md:text-right' : 'md:col-start-2 md:pl-20'}`}
        style={contentStyle}
      >
        <p className="text-[11px] tracking-[0.25em] uppercase mb-3" style={{ color: `${nodeColor}99` }}>Step {step.number}</p>
        <h3 className="font-serif text-3xl sm:text-4xl font-bold leading-tight mb-5" style={{ color: nodeColor }}>{step.title}</h3>
        <div className={`w-8 h-px mb-5 ${left ? 'md:ml-auto' : ''}`} style={{ background: nodeColor }} />
        <p className="text-ink-500 text-base leading-relaxed">{step.description}</p>

        {step.skills.length > 0 && (
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
        )}

        {step.feeNote && (
          <div className={`mt-7 pt-5 border-t border-line inline-flex items-center gap-2 ${left ? 'md:ml-auto' : ''}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0" />
            <span className="text-[11px] tracking-wide uppercase text-ink-500">{step.feeNote}</span>
          </div>
        )}

        {step.subTeams && (
          <div className="grid sm:grid-cols-2 gap-3 mt-6 text-left">
            {step.subTeams.map(team => <SubTeamCard key={team.name} team={team} />)}
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
            From Academy to Alumni
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
