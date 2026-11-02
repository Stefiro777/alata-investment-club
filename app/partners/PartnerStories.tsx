'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export type PartnerStory = {
  id: string
  name: string
  type: 'partner' | 'sponsor'
  logo: string | null
  text: string | null
  website: string | null
}

const DURATION = 6000

/**
 * Boards P2 / P2b: partners then sponsors, the chosen one lit. A line under it
 * fills in six seconds and moves on, in a loop. A click stops the timer on
 * that name ("Paused"); another click on the same name starts it again.
 */
export default function PartnerStories({ items }: { items: PartnerStory[] }) {
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  // Each new turn of the timer gets its own key, so the CSS fill restarts.
  const [turn, setTurn] = useState(0)

  useEffect(() => {
    if (paused || reduced || items.length < 2) return
    const t = setTimeout(() => {
      setIndex(i => (i + 1) % items.length)
      setTurn(n => n + 1)
    }, DURATION)
    return () => clearTimeout(t)
  }, [paused, reduced, items.length, index, turn])

  if (items.length === 0) return null
  const current = items[index]

  function choose(i: number) {
    if (i === index) {
      setPaused(p => !p)
      setTurn(n => n + 1)
      return
    }
    setIndex(i)
    setPaused(true)
    setTurn(n => n + 1)
  }

  function visit(p: PartnerStory) {
    fetch('/api/partners/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId: p.id }),
      keepalive: true,
    }).catch(() => {})
  }

  const groups: { label: string; type: PartnerStory['type'] }[] = [
    { label: 'Partners', type: 'partner' },
    { label: 'Sponsors', type: 'sponsor' },
  ]

  return (
    <section className="bg-ivory py-14 text-night md:flex md:min-h-svh md:items-center md:py-[max(32px,5svh)]" aria-label="Partners and sponsors">
      <div className="rd-gutter grid w-full grid-cols-1 gap-8 md:grid-cols-[clamp(190px,19vw,270px)_minmax(0,1fr)] md:gap-[clamp(20px,2.4vw,34px)]">
        <div className="min-w-0">
          {/* Mobile: one scrolling row of names. Desktop: the lit list. */}
          <div className="flex gap-7 overflow-x-auto pb-3 [scrollbar-width:none] md:block md:overflow-visible md:pb-0">
            {groups.map((g, gi) => {
              const list = items.map((p, i) => ({ p, i })).filter(x => x.p.type === g.type)
              if (list.length === 0) return null
              return (
                <div key={g.type} className={`contents md:block ${gi > 0 ? "md:mt-[26px]" : ""}`}>
                  <div className="rd-eyebrow hidden text-night/60 md:mb-[18px] md:block">{g.label}</div>
                  {list.map(({ p, i }) => {
                    const on = i === index
                    return (
                      <div key={p.id} className="shrink-0 md:mb-3.5">
                        <button
                          type="button"
                          onClick={() => choose(i)}
                          aria-pressed={on}
                          className={`rd-italic block whitespace-nowrap text-left leading-[1.1] transition-[color,font-size] duration-300 md:whitespace-normal ${
                            on ? 'text-[28px] text-night md:text-[34px]' : 'text-[22px] text-night/40 hover:text-night/70 md:text-[26px]'
                          }`}
                        >
                          {p.name}
                        </button>
                        {on && (
                          <>
                            <div className="mt-2.5 h-[2px] w-full max-w-[200px] bg-night/20">
                              <i
                                key={turn}
                                className="block h-[2px] bg-night"
                                style={paused || reduced
                                  ? { width: '100%' }
                                  : { width: 0, animation: `rd-fill ${DURATION}ms linear forwards` }}
                              />
                            </div>
                            {paused && <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-night/60">Paused on your choice</div>}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.article
            key={current.id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="min-w-0"
          >
            <div className="flex h-[84px] w-[230px] items-center md:h-[clamp(52px,9svh,84px)] md:w-[clamp(150px,16svh,230px)]">
              {current.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={current.logo} alt={`${current.name} logo`} className="max-h-full max-w-full object-contain object-left" />
              ) : null}
            </div>
            <div className="rd-eyebrow mt-8 text-night/60 md:mt-[max(16px,4.5svh)]">{current.type === 'sponsor' ? 'Sponsor' : 'Partner'}</div>
            <h2 className="rd-display mt-2 text-[clamp(44px,min(6vw,9.5svh),72px)] md:mt-[max(6px,1.2svh)]">{current.name}</h2>
            {current.text && (
              <p className="mt-5 max-w-[700px] whitespace-pre-line text-[17px] leading-[1.75] text-night/[0.88] md:mt-[max(12px,2.4svh)] md:text-[clamp(15px,2.35svh,18px)] md:leading-[1.65]">{current.text}</p>
            )}
            {current.website && (
              <a
                href={current.website}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => visit(current)}
                className="rd-italic mt-6 inline-block text-[clamp(26px,4.4svh,34px)] hover:underline underline-offset-[0.18em] md:mt-[max(14px,3svh)]"
              >
                Visit website
              </a>
            )}
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  )
}
