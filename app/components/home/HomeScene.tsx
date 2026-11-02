'use client'

import { useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { VeiledMedia } from '@/app/components/site/Media'
import { StatusPill } from '@/app/components/site/ui'
import { splitStatValue, type AboutStat } from '@/lib/about-stats'
import { shortDate } from '@/lib/event-display'

export type HomeEvent = { id: string; slug: string | null; title: string; date: string; status: string | null }

/*
 * One continuous scene, seven moments of the scroll (boards F1 → F6):
 * 0% the loop · 17% vision · 33% values · 50% numbers · 67% next events ·
 * 83% credits · 100% finale. A tall track keeps a sticky full-screen stage;
 * each moment fades in and out around its point of the scroll.
 */
const MOMENTS = 7
/**
 * Scroll space of each moment, in viewport heights. The first and last are
 * half-moments; the values (F2v) have double room so the words light up slowly.
 */
const WEIGHTS = [50, 100, 200, 100, 100, 100, 50]
const TOTAL = WEIGHTS.reduce((a, b) => a + b, 0)
const FADE = 18 / TOTAL

/** Scroll points where moment i hands over to moment i+1. */
const handover = (i: number) => WEIGHTS.slice(0, i + 1).reduce((a, b) => a + b, 0) / TOTAL

function useMomentOpacity(progress: MotionValue<number>, i: number) {
  const input = i === 0
    ? [0, handover(0) - FADE, handover(0) + FADE]
    : i === MOMENTS - 1
      ? [handover(i - 1) - FADE, handover(i - 1) + FADE, 1]
      : [handover(i - 1) - FADE, handover(i - 1) + FADE, handover(i) - FADE, handover(i) + FADE]
  const output = i === 0 ? [1, 1, 0] : i === MOMENTS - 1 ? [0, 1, 1] : [0, 1, 1, 0]
  return useTransform(progress, input, output)
}

/** 0 → 1 while moment i is on stage. */
function useLocal(progress: MotionValue<number>, i: number) {
  const from = i === 0 ? 0 : handover(i - 1)
  const to = i === MOMENTS - 1 ? 1 : handover(i)
  return useTransform(progress, [from, to], [0, 1], { clamp: true })
}

function Moment({ progress, index, children, className = '' }: {
  progress: MotionValue<number>
  index: number
  children: ReactNode
  className?: string
}) {
  const opacity = useMomentOpacity(progress, index)
  const pointerEvents = useTransform(opacity, v => (v > 0.5 ? 'auto' : 'none'))
  const visibility = useTransform(opacity, v => (v <= 0.001 ? 'hidden' : 'visible'))
  return (
    <motion.section
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity, pointerEvents, visibility }}
    >
      {children}
    </motion.section>
  )
}


/* ── F3: a counter that rolls from 0 to the real value with the scroll ── */
function Drum({ local, stat, reduced }: { local: MotionValue<number>; stat: AboutStat; reduced: boolean }) {
  const { target, suffix } = splitStatValue(stat.value)
  const [n, setN] = useState(reduced || target === null ? target ?? 0 : 0)
  useMotionValueEvent(local, 'change', v => {
    if (reduced || target === null) return
    setN(Math.round(Math.min(1, v / 0.5) * target))
  })
  const show = (k: number) => (target === null ? stat.value : `${k}${suffix}`)
  return (
    <div>
      <div className="mb-1.5 text-[13px] tracking-[0.04em] text-ivory/90">{stat.label}</div>
      <div className="relative h-[clamp(92px,17vw,250px)] overflow-hidden" aria-label={`${stat.label}: ${stat.value}`}>
        {target !== null && n > 0 && (
          <div aria-hidden className="absolute left-0 top-[-58%] whitespace-nowrap font-serif text-[clamp(64px,13.3vw,200px)] font-semibold leading-[0.9] tracking-[-0.02em] text-ivory/[0.18]">
            {show(n - 1)}
          </div>
        )}
        <div aria-hidden className="absolute left-0 top-[14%] whitespace-nowrap font-serif text-[clamp(64px,13.3vw,200px)] font-semibold leading-[0.9] tracking-[-0.02em]">
          {show(n)}
        </div>
        {target !== null && (
          <div aria-hidden className="absolute left-0 top-[86%] whitespace-nowrap font-serif text-[clamp(64px,13.3vw,200px)] font-semibold leading-[0.9] tracking-[-0.02em] text-ivory/[0.18]">
            {show(n + 1)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── F2v: the three values ──
   Mouse: the word under the pointer lights up, the others drop. Touch (and
   when nothing is hovered): scroll lights them one after the other. */
const VALUES = ['Community', 'Drive', 'Ambition'] as const
const LIGHT_AT = [0.2, 0.55, 0.8]

function ValueWord({ index, local, hovered, hoverAny, children }: {
  index: number
  local: MotionValue<number>
  hovered: MotionValue<number>
  hoverAny: MotionValue<number>
  children: ReactNode
}) {
  const color = useTransform([local, hovered, hoverAny], ([l, h, any]: number[]) => {
    const at = LIGHT_AT[index]
    const scroll = Math.min(1, Math.max(0, (l - (at - 0.08)) / 0.08))
    const light = any * h + (1 - any) * scroll
    return `rgba(245,241,232,${(0.3 + 0.7 * light).toFixed(3)})`
  })
  return <motion.span style={{ color }} className="block">{children}</motion.span>
}

function Values({ local }: { local: MotionValue<number> }) {
  const hoverAny = useMotionValue(0)
  const hovers = [useMotionValue(0), useMotionValue(0), useMotionValue(0)]

  function enter(i: number, e: React.PointerEvent) {
    if (e.pointerType !== 'mouse') return
    hovers.forEach((m, j) => animate(m, j === i ? 1 : 0, { duration: 0.35 }))
    animate(hoverAny, 1, { duration: 0.35 })
  }
  function leave(e: React.PointerEvent) {
    if (e.pointerType !== 'mouse') return
    animate(hoverAny, 0, { duration: 0.35 })
  }

  return (
    <>
      {VALUES.map((word, i) => (
        <div
          key={word}
          onPointerEnter={e => enter(i, e)}
          onPointerLeave={leave}
          className={`rd-display cursor-default text-[clamp(60px,11.3vw,136px)] leading-[1.2] ${i === 1 ? 'italic' : ''}`}
        >
          <ValueWord index={i} local={local} hovered={hovers[i]} hoverAny={hoverAny}>{word}</ValueWord>
        </div>
      ))}
    </>
  )
}

/* ── F5b: closing credits rising slowly, the centred name fully lit ── */
function Credits({ local, names, reduced }: { local: MotionValue<number>; names: string[]; reduced: boolean }) {
  const y = useTransform(local, [0, 1], reduced ? ['0%', '0%'] : ['22%', '-22%'])
  return (
    <div
      className="absolute inset-x-0 top-[150px] bottom-[70px] overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to bottom, transparent 0%, #000 38%, #000 62%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 38%, #000 62%, transparent 100%)',
      }}
    >
      <motion.ul className="flex min-h-full flex-col items-center justify-center gap-[clamp(18px,3vh,30px)] py-[20vh] text-center" style={{ y }}>
        {names.map(name => (
          <li key={name} className="rd-display px-6 text-[clamp(30px,4vw,48px)]">{name}</li>
        ))}
      </motion.ul>
    </div>
  )
}

export default function HomeScene({
  nav,
  stats,
  events,
  credits,
}: {
  nav: ReactNode
  stats: AboutStat[]
  events: HomeEvent[]
  credits: string[]
}) {
  const track = useRef<HTMLDivElement>(null)
  const reduced = !!useReducedMotion()
  const { scrollYProgress: p } = useScroll({ target: track, offset: ['start start', 'end end'] })

  const local2v = useLocal(p, 2)
  const local3 = useLocal(p, 3)
  const local5 = useLocal(p, 5)

  // The navbar stays through the scene: dark on the ivory moment (F4),
  // ivory everywhere else.
  const darkLogo = useTransform(p, [handover(3) - FADE, handover(3) + FADE, handover(4) - FADE, handover(4) + FADE], [0, 1, 1, 0])
  const lightLogo = useTransform(darkLogo, v => 1 - v)
  const navColor = useTransform(darkLogo, [0, 1], ['#f5f1e8', '#0b1d16'])
  const scrollCue = useTransform(p, [0, 24 / TOTAL], [1, 0])
  const barColor = useTransform(darkLogo, v => (v > 0.5 ? '#1a4a3a' : '#f5f1e8'))

  return (
    <div ref={track} className="relative bg-night text-ivory" style={{ height: `${TOTAL + 100}svh` }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden">

        {/* F1 · the loop */}
        <Moment progress={p} index={0}>
          <VeiledMedia video="/redesign/home-loop.mp4" poster="/redesign/home-loop-poster.jpg" opacity={0.48} priority />
          <motion.div className="rd-eyebrow absolute right-[var(--gutter)] top-[100px] text-ivory/80" style={{ opacity: scrollCue }}>
            Scroll
          </motion.div>
          <h1 className="absolute inset-x-0 bottom-[28px] whitespace-nowrap text-center font-serif text-[25vw] font-medium leading-none tracking-[-0.02em]">
            ALATA
          </h1>
        </Moment>

        {/* F2 · the vision */}
        <Moment progress={p} index={1} className="bg-pine">
          <div className="rd-gutter grid h-full grid-rows-[auto_minmax(0,1fr)] gap-6 pb-10 pt-[96px] md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:grid-rows-1 md:gap-12 md:pb-[64px] md:pt-[112px]">
            <div className="flex flex-col justify-between gap-8">
              <p className="rd-display max-w-[600px] text-[clamp(32px,5.6vw,68px)] leading-[1.24]">
                A community where ambition meets opportunity, <em>regardless of where you start.</em>
              </p>
              <p className="max-w-[420px] text-[15px] leading-[1.65] text-ivory/85">
                The first finance club of the University of Brescia. Students who learn from bankers and investors, and publish their own research.
              </p>
            </div>
            <figure className="relative min-h-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/redesign/borsa-insegna.jpg" alt="The spiral staircase at Borsa Italiana, Milan" className="h-[calc(100%-36px)] w-full object-cover" />
              <figcaption className="rd-italic mt-3.5 text-[16px] text-ivory/75">Borsa Italiana, Milan</figcaption>
            </figure>
          </div>
        </Moment>

        {/* F2v · the values */}
        <Moment progress={p} index={2}>
          <VeiledMedia image="/redesign/workshop-valori.jpg" opacity={0.7} />
          <div className="relative flex h-full flex-col items-center justify-center px-6 pt-16 text-center">
            <Values local={local2v} />
            <p className="mt-8 max-w-[640px] text-[16px] leading-[1.6] text-ivory/90">
              Taking initiative isn&apos;t a buzzword here, it&apos;s the entry requirement.
            </p>
          </div>
          <div className="rd-italic rd-gutter absolute bottom-[28px] left-0 text-[16px] text-ivory/75">
            Forbes Next Leaders × EssilorLuxottica, Milan
          </div>
        </Moment>

        {/* F3 · the numbers */}
        <Moment progress={p} index={3}>
          <VeiledMedia video="/redesign/pbd-palco.mp4" poster="/redesign/pbd-palco-poster.jpg" veil="#12352a" opacity={0.78} />
          <div className="rd-gutter relative grid h-full grid-cols-2 content-center gap-x-[clamp(16px,4vw,48px)] gap-y-[clamp(8px,2.4vh,28px)] pt-16 md:content-start md:pt-[100px]">
            {stats.map(s => <Drum key={s.label} local={local3} stat={s} reduced={reduced} />)}
          </div>
          <div className="rd-italic absolute bottom-[28px] right-[var(--gutter)] text-[16px] text-ivory/75">Private Banker Day</div>
        </Moment>

        {/* F4 · next up (the light comes up) */}
        <Moment progress={p} index={4} className="bg-ivory text-night">
          <div className="rd-gutter grid h-full gap-10 pb-12 pt-[104px] md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-16 md:pb-[58px] md:pt-[120px]">
            <figure className="relative hidden min-h-0 md:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/redesign/borsa-pubblico.jpg" alt="A talk at Borsa Italiana" className="h-[calc(100%-36px)] w-full object-cover" />
              <figcaption className="rd-italic mt-3 text-[16px] text-earth-700">Inside the Markets, Borsa Italiana</figcaption>
            </figure>
            <div className="flex min-h-0 flex-col md:-mt-9">
              <h2 className="rd-display text-[clamp(44px,5.3vw,64px)]">Next up</h2>
              {events.length > 0 ? (
                <ul className="mt-4 border-t border-night md:mt-5">
                  {events.map(ev => (
                    <li key={ev.id}>
                      <Link
                        href={ev.slug ? `/events/${ev.slug}` : '/events'}
                        className="grid min-h-[clamp(84px,17vh,128px)] grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 sm:gap-x-5 border-b border-night/25 py-3 transition-colors hover:bg-night/[0.03] sm:grid-cols-[minmax(110px,190px)_minmax(0,1fr)_auto]"
                      >
                        <span className="rd-display text-[26px] leading-[1.1] sm:text-[clamp(30px,4.2vw,50px)]">{shortDate(ev.date)}</span>
                        <span className="text-[15px] leading-[1.35] md:text-[18px]">{ev.title}</span>
                        <span className="col-start-2 mt-2 justify-self-start sm:col-start-auto sm:mt-0 sm:justify-self-end">
                          <StatusPill solid={ev.status === 'open'}>{ev.status === 'open' ? 'Open' : 'Soon'}</StatusPill>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rd-italic mt-8 text-[28px] text-earth-700">New dates are on their way.</p>
              )}
            </div>
          </div>
        </Moment>

        {/* F5b · in good company, like a film's closing credits */}
        <Moment progress={p} index={5}>
          <VeiledMedia image="/redesign/borsa-sala.jpg" opacity={0.72} />
          <p className="rd-italic absolute inset-x-0 top-[92px] text-center text-[clamp(26px,2.8vw,34px)]">In good company</p>
          <Credits local={local5} names={credits} reduced={reduced} />
          <div className="rd-italic absolute bottom-[28px] right-[var(--gutter)] text-[16px] text-ivory/60">Inside the Markets, Borsa Italiana</div>
        </Moment>

        {/* F6 · the finale: the loop returns */}
        <Moment progress={p} index={6}>
          <VeiledMedia video="/redesign/home-loop.mp4" poster="/redesign/home-loop-poster.jpg" opacity={0.6} />
          <div className="relative flex flex-col items-center px-6 pt-[clamp(120px,19vh,148px)] text-center">
            <p className="rd-display max-w-[900px] text-[clamp(40px,7vw,84px)]">
              You bring the ambition.<br /><em>We bring the wings.</em>
            </p>
            <Link href="/join-us" className="rd-italic mt-6 text-[clamp(36px,4.5vw,54px)] hover:underline underline-offset-[0.18em]">
              Join the Club
            </Link>
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-[28px] whitespace-nowrap text-center font-serif text-[25vw] font-medium leading-none tracking-[-0.02em]">
            ALATA
          </div>
        </Moment>

        {/* Scene logo, light or dark with the ground */}
        <div className="rd-gutter pointer-events-none absolute left-0 top-6 z-30 md:top-[28px]">
          <Link href="/" className="pointer-events-auto relative block h-[34px] w-[63px] md:h-[44px] md:w-[82px]" aria-label="Alata Investment Club, home">
            { }
            <motion.img src="/redesign/logo-light.png" alt="Alata" className="absolute inset-0 h-full w-auto" style={{ opacity: lightLogo }} />
            { }
            <motion.img src="/redesign/logo-dark.png" alt="" aria-hidden className="absolute inset-0 h-full w-auto" style={{ opacity: darkLogo }} />
          </Link>
        </div>

        <motion.div className="absolute inset-x-0 top-0 z-40" style={{ color: navColor }}>
          {nav}
        </motion.div>

        <motion.div aria-hidden className="absolute bottom-0 left-0 z-30 h-[3px] w-full origin-left" style={{ scaleX: p, background: barColor }} />
      </div>
    </div>
  )
}
