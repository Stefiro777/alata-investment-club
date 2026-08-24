'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { EASE } from '../components/motion/Motion'

type SubTeam = {
  name: string
  color: string
  description?: string
  skills: string[]
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
        description:
          'Building practical experience in company analysis and financial research, turning academic theory into real market insight through a learning-by-doing approach.',
        skills: [
          'Company Analysis & Equity Research Methodology',
          'Financial Content Creation on Listed Companies & Market Trends',
          'Report Writing & Financial Disclosure',
          'Company Valuation Fundamentals',
        ],
      },
      {
        name: 'M&A',
        color: '#1a4a3a',
        description:
          'Closing the gap between academic analysis and investment banking standards, operating as a real in-house investment bank for the club.',
        skills: [
          'M&A Deal Analysis & Interpretation',
          'Investment Banking-Grade PowerPoint Deliverables (Fairness Opinions, Board Materials)',
          'Financial Modeling in Excel (Comps, DCF, Premium Analysis)',
          'Structured, Replicable Deal Methodology',
        ],
      },
      {
        name: 'Macro',
        color: '#1a4a3a',
        description:
          'Analysis of global events and macroeconomic dynamics that move financial markets, with a practical approach oriented towards real asset classes.',
        skills: [
          'Reading & Interpreting Global Macro Events',
          'Market Reports & Analysis',
          'Investment Thesis Development on Macro Scenarios',
          'Linking Macro Events to Market Expectations Across Asset Classes',
        ],
      },
      {
        name: 'Events',
        color: '#1d4ed8',
        description:
          "Strengthening the club community through shared experiences, and building partnerships that give members access to top-tier networks and resources.",
        skills: [
          'End-to-End Event Management & Execution',
          'Partner, Sponsor & University Relations',
          'Organizational Planning & On-Site Delivery',
          'Community Building & Networking',
        ],
      },
      {
        name: 'Media',
        color: '#4b5320',
        description:
          "Shaping the club's brand and voice across social platforms, turning the club's growth and identity into content that builds a genuine community.",
        skills: [
          'Content Creation (Canva/CapCut)',
          'Social Media Management (LinkedIn, Instagram, TikTok)',
          'Brand Storytelling',
          'Financial Content Divulgation for a General Audience',
        ],
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

// ── Gruppo teams: tab / accordion panel ─────────────────────────────────────────

const skillListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

function GroupTeamsPanel({ subTeams }: { subTeams: SubTeam[] }) {
  const [active, setActive] = useState(0)
  const reduced = useReducedMotion()
  const team = subTeams[active]

  return (
    <div>
      {/* Tab row — horizontally scrollable on mobile, never wraps */}
      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden mb-10 border-b border-line" style={{ scrollbarWidth: 'none' }}>
        <div className="flex w-max sm:w-full">
          {subTeams.map((t, i) => {
            const isActive = i === active
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setActive(i)}
                className="flex-shrink-0 flex items-center gap-2.5 px-5 py-4 border-b-2 -mb-px transition-colors whitespace-nowrap"
                style={{ borderColor: isActive ? t.color : 'transparent' }}
              >
                <span className="text-[10px] font-serif transition-colors" style={{ color: isActive ? t.color : '#9ca3af' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-wide transition-colors"
                  style={{ color: isActive ? t.color : '#9ca3af' }}
                >
                  {t.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={team.name}
          initial={reduced ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduced ? undefined : { opacity: 0, x: -24 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: EASE }}
        >
          <p className="text-xs tracking-[0.25em] uppercase mb-4" style={{ color: team.color }}>
            Team {String(active + 1).padStart(2, '0')} / {String(subTeams.length).padStart(2, '0')}
          </p>
          <h3
            className="font-serif text-6xl sm:text-7xl lg:text-8xl font-semibold leading-[0.95] mb-6"
            style={{ color: team.color }}
          >
            {team.name}
          </h3>
          <div className="w-16 h-1 mb-8" style={{ background: team.color }} />
          {team.description && (
            <p className="text-ink-500 text-base sm:text-lg leading-relaxed max-w-2xl mb-10">
              {team.description}
            </p>
          )}
          <motion.ul
            className="flex flex-col gap-3 max-w-2xl"
            initial="hidden"
            animate="show"
            variants={reduced ? undefined : skillListVariants}
          >
            {team.skills.map(skill => (
              <motion.li
                key={skill}
                variants={reduced ? undefined : { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
                className="flex items-center gap-3 text-sm sm:text-base text-ink-700"
              >
                <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: team.color }} />
                {skill}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Gruppo step block — full-width, no timeline spine through its content ───────

function GroupStepBlock({ step }: { step: Step }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const nodeColor = step.color ?? '#1a4a3a'

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const contentStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : 'translateY(24px)',
    transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1) 120ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 120ms',
  }

  return (
    <div ref={ref} className="relative">
      {/* Node on the shared timeline axis — marker only, no line runs through this step */}
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

      {/* Unified full-width column — header, fee note and team panel share the same
          left-aligned container so the step reads as one coherent block. */}
      <div className="pl-20 pr-6 md:px-2 lg:px-4 md:pt-24 pt-1" style={contentStyle}>
        <p className="text-[11px] tracking-[0.25em] uppercase mb-3" style={{ color: `${nodeColor}99` }}>Step {step.number}</p>
        <h3 className="font-serif text-3xl sm:text-4xl font-bold leading-tight mb-5" style={{ color: nodeColor }}>{step.title}</h3>
        <div className="w-8 h-px mb-5" style={{ background: nodeColor }} />
        <p className="text-ink-500 text-base leading-relaxed max-w-2xl">{step.description}</p>

        {step.feeNote && (
          <div className="mt-7 pt-5 border-t border-line inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0" />
            <span className="text-[11px] tracking-wide uppercase text-ink-500">{step.feeNote}</span>
          </div>
        )}

        {step.subTeams && (
          <div className="mt-14">
            <GroupTeamsPanel subTeams={step.subTeams} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Academy / Alumni step block — alternating two-column layout, own line ───────

function StepBlock({
  step,
  index,
  isFirst,
  isLast,
}: {
  step: Step
  index: number
  isFirst: boolean
  isLast: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
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

  // Local scroll-fill for this step's own line segment — replaces the old
  // section-wide progress line, which used to run straight through Gruppo.
  useEffect(() => {
    const el = ref.current
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

  const contentStyle: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'none' : `translateX(${left ? -32 : 32}px)`,
    transition: 'opacity 700ms cubic-bezier(0.22,1,0.36,1) 120ms, transform 700ms cubic-bezier(0.22,1,0.36,1) 120ms',
  }

  return (
    <div ref={ref} className="relative md:grid md:grid-cols-2 md:gap-0">
      {/* This step's own line segment — extends half a gap into the space
          toward the next/previous step, but never into Gruppo's content. */}
      <div
        className={`absolute left-6 md:left-1/2 w-px bg-line -translate-x-1/2 ${isFirst ? 'top-0' : '-top-12'} ${isLast ? 'bottom-0' : '-bottom-12'}`}
      >
        <div className="absolute top-0 left-0 w-full bg-forest" style={{ height: `${progress * 100}%` }} />
      </div>

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
      </div>
    </div>
  )
}

export default function TimelineSection() {
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

        {/* Timeline track — each Academy/Alumni block draws its own line segment;
            Gruppo (full-width) has no line running through its content. */}
        <div className="flex flex-col gap-24">
          {steps.map((step, i) => (
            step.subTeams
              ? <GroupStepBlock key={step.number} step={step} />
              : <StepBlock key={step.number} step={step} index={i} isFirst={i === 0} isLast={i === steps.length - 1} />
          ))}
        </div>
      </div>
    </section>
  )
}
