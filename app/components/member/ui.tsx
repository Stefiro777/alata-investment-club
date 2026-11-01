import Link from 'next/link'
import type { ReactNode } from 'react'

/* Building blocks shared by the member area and the Board panel boards:
   italic section titles over a rule, rows with an italic action, small
   uppercase field labels, pills. */

export function PageTitle({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="rd-display text-[clamp(40px,4.6vw,54px)] [&_em]:text-club">{title}</h1>
        {sub && <p className="mt-3 max-w-[560px] text-[14px] leading-[1.6] text-earth-600">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function Section({ title, meta, after, children, id }: { title: ReactNode; meta?: ReactNode; after?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="mb-3 mt-[38px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="rd-italic whitespace-nowrap text-[28px] md:text-[32px]">{title}</h2>
        {meta && <div className="rd-eyebrow text-[10px] text-earth-500">{meta}</div>}
      </div>
      <div className="border-t border-night" />
      {after}
      {children}
    </section>
  )
}

export function ProgressRule({ value }: { value: number }) {
  return (
    <div className="relative -mt-px" aria-hidden>
      <i className="absolute left-0 top-[-2px] block h-1 bg-club" style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  )
}

export function Row({ title, detail, href, external, action, onClick, lead }: {
  title: ReactNode
  detail?: ReactNode
  href?: string
  external?: boolean
  action?: ReactNode
  onClick?: () => void
  lead?: ReactNode
}) {
  const inner = (
    <>
      {lead}
      <div className="min-w-0">
        <div className="font-serif text-[22px] font-medium leading-[1.1]">{title}</div>
        {detail && <div className="mt-[3px] text-[12px] leading-[1.5] text-earth-600">{detail}</div>}
      </div>
      {action && <span className="rd-italic text-[20px]">{action}</span>}
    </>
  )
  const cls = `grid ${lead ? 'grid-cols-[auto_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'} items-center gap-x-4 border-b border-night/20 py-3.5 text-left w-full transition-colors hover:bg-night/[0.03]`
  if (href && external) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

export function FieldRow({ label, value, aside, muted }: { label: string; value: ReactNode; aside?: ReactNode; muted?: boolean }) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-night/20 py-[11px] text-[13px] sm:grid-cols-[120px_minmax(0,1fr)_auto]">
      <span className="rd-eyebrow text-[10px] text-earth-500">{label}</span>
      <span className={`min-w-0 truncate ${muted ? 'text-earth-600' : ''}`}>{value}</span>
      <span className="text-[11px] text-earth-500">{aside}</span>
    </div>
  )
}

export function Pill({ children, href, solid, tone = 'light', onClick, active }: {
  children: ReactNode
  href?: string
  solid?: boolean
  tone?: 'light' | 'dark'
  onClick?: () => void
  active?: boolean
}) {
  const on = solid || active
  const cls = `inline-block whitespace-nowrap rounded-full border px-[15px] py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${
    tone === 'dark'
      ? on ? 'border-ivory bg-ivory text-night' : 'border-ivory/80 text-ivory hover:bg-ivory/10'
      : on ? 'border-night bg-night text-ivory' : 'border-night text-night hover:bg-night/5'
  }`
  if (href) return <Link href={href} className={cls}>{children}</Link>
  if (onClick) return <button type="button" onClick={onClick} aria-pressed={active} className={cls}>{children}</button>
  return <span className={cls}>{children}</span>
}

/** Pill tabs used at the top of team pages and Board screens. */
export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={`rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${value === t.key ? 'border-night bg-night text-ivory' : 'border-night/50 hover:border-night'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
