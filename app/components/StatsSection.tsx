'use client'

import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: 100, label: 'Members' },
  { value: 20,  label: 'Calls with IB, PE & Consulting professionals' },
  { value: 500, label: 'Analyses published' },
  { value: 800, label: 'LinkedIn followers' },
]

const STAGGER = 220 // ms between each stat starting

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const start = performance.now()

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // easeOutExpo — fast start, long elegant settle
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [active, target, duration])

  return count
}

function StatItem({
  value,
  label,
  active,
  index,
}: {
  value: number
  label: string
  active: boolean
  index: number
}) {
  // Each stat reveals AND starts counting on its own beat
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setStarted(true), index * STAGGER)
    return () => clearTimeout(t)
  }, [active, index])

  const count = useCountUp(value, 1800, started)
  const done = count === value

  return (
    <div
      className="flex flex-col items-center gap-4 text-center"
      style={{
        opacity: started ? 1 : 0,
        transform: started ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      <span className="font-serif text-6xl font-semibold text-white leading-none tabular-nums">
        {count}
        <span
          className="inline-block"
          style={{
            opacity: done ? 1 : 0,
            transform: done ? 'translateX(0)' : 'translateX(-4px)',
            transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          +
        </span>
      </span>
      <div
        className="h-px bg-white/30"
        style={{
          width: started ? 32 : 0,
          transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s',
        }}
      />
      <span className="text-xs tracking-widest uppercase text-white/70">
        {label}
      </span>
    </div>
  )
}

export default function StatsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect() } },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="bg-forest py-20 overflow-hidden">
      <div ref={ref} className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Hairline that draws itself before the numbers appear */}
        <div
          className="h-px bg-white/20 mb-14 origin-left"
          style={{
            transform: active ? 'scaleX(1)' : 'scaleX(0)',
            transition: 'transform 1.2s cubic-bezier(0.22,1,0.36,1)',
          }}
        />
        <div className="grid grid-cols-2 gap-y-12 lg:grid-cols-4 lg:gap-y-0">
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className={`px-8 py-4 ${i > 0 ? 'lg:border-l lg:border-white/20' : ''} ${i % 2 === 1 ? 'border-l border-white/20 lg:border-l' : ''}`}
            >
              <StatItem value={value} label={label} active={active} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
