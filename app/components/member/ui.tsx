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

/* ── Pills ─────────────────────────────────────────────────────────────────────
   One look for every pill, tab and switch of the member area and the Board panel:
   fully rounded, active = green #1a4a3a with ivory text, inactive = outline.
   Nothing square around them. */

export type PillSize = 'md' | 'sm'

/** The class string, for the rare element that must carry the pill look itself (a menu trigger, a label). */
export function pillClass({ active = false, tone = 'light', size = 'md' }: { active?: boolean; tone?: 'light' | 'dark'; size?: PillSize } = {}) {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border font-semibold uppercase tracking-[0.14em] transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const dim = size === 'sm' ? 'px-3 py-1 text-[9px]' : 'px-4 py-2 text-[10px]'
  const look = tone === 'dark'
    ? active ? 'border-ivory bg-ivory text-night' : 'border-ivory/70 text-ivory hover:bg-ivory/10'
    : active ? 'border-club bg-club text-ivory' : 'border-night/50 text-night hover:border-night hover:bg-night/[0.04]'
  return `${base} ${dim} ${look}`
}

export function Pill({ children, href, solid, tone = 'light', onClick, active, size = 'md', disabled, type = 'button' }: {
  children: ReactNode
  href?: string
  /** Filled (active look) without being a toggle. */
  solid?: boolean
  tone?: 'light' | 'dark'
  onClick?: () => void
  /** A toggle that is on: also sets aria-pressed. */
  active?: boolean
  size?: PillSize
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const cls = pillClass({ active: solid || active, tone, size })
  if (href) return <Link href={href} className={cls}>{children}</Link>
  if (onClick || type === 'submit') return <button type={type} onClick={onClick} disabled={disabled} aria-pressed={active} className={cls}>{children}</button>
  return <span className={cls}>{children}</span>
}

/** One-of-many switch (Open / Soon / Closed, Calendar / List): separate rounded pills, no frame. */
export function SegmentedPills<T extends string>({ options, value, onChange, size = 'md', tone = 'light', disabled, label }: {
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: PillSize
  tone?: 'light' | 'dark'
  disabled?: boolean
  label?: string
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === o.value}
          onClick={() => { if (o.value !== value) onChange(o.value) }}
          className={pillClass({ active: value === o.value, tone, size })}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Tabs at the top of a page or a team screen. */
export function Tabs<T extends string>({ tabs, value, onChange, size = 'md' }: {
  tabs: { key: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
  size?: PillSize
}) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={pillClass({ active: value === t.key, size })}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
