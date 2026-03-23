'use client'

import { useEffect, useRef, useState } from 'react'

const stats = [
  { value: 80,  label: 'Members' },
  { value: 20,  label: 'Calls with IB, PE & Consulting professionals' },
  { value: 500, label: 'Analyses published' },
  { value: 740, label: 'LinkedIn followers' },
]

function useCountUp(target: number, duration: number, active: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!active) return
    const start = performance.now()

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [active, target, duration])

  return count
}

function StatItem({ value, label, active }: { value: number; label: string; active: boolean }) {
  const count = useCountUp(value, 800, active)
  const done = count === value

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <span className="font-serif text-6xl font-semibold text-white leading-none">
        {count}{done ? '+' : ''}
      </span>
      <div className="w-8 h-px bg-white opacity-30" />
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
    <section className="bg-[#1a4a3a] py-20">
      <div ref={ref} className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {stats.map(({ value, label }, i) => (
            <div
              key={label}
              className={`px-8 py-4 ${i > 0 ? 'border-l border-white/20' : ''}`}
            >
              <StatItem value={value} label={label} active={active} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
