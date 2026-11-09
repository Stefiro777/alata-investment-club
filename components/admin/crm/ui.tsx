'use client'

import type { ReactNode } from 'react'

/* Building blocks of the CRM boards (ABc1d–ABc4d): a line of numbers, a list with
   aligned columns of constant width, a sheet on the right (below on mobile). */

export const fieldCls = 'w-full border-0 border-b border-night/40 bg-transparent py-2 text-[13px] text-night outline-none transition-colors placeholder:text-earth-500 focus:border-night'
export const labelCls = 'rd-eyebrow block text-[10px] text-earth-500'
export const btnPrimary = 'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-night bg-night px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ivory transition-colors hover:bg-moss disabled:cursor-not-allowed disabled:opacity-50'
export const btnGhost = 'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-night/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-night transition-colors hover:border-night disabled:cursor-not-allowed disabled:opacity-50'
export const btnDanger = 'inline-flex items-center justify-center whitespace-nowrap rounded-full border border-[#8a2a1d] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a2a1d] transition-colors hover:bg-[#8a2a1d] hover:text-ivory disabled:cursor-not-allowed disabled:opacity-50'
export const errorCls = 'border-l-2 border-[#8a2a1d] py-1 pl-3 text-[12px] text-[#8a2a1d]'

/** The line of numbers at the top of a CRM tab. */
export function Numbers({ items }: { items: { value: ReactNode; label: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-night pt-6 md:grid-cols-4">
      {items.map(n => (
        <div key={n.label}>
          <div className="rd-num font-serif text-[clamp(40px,4.5vw,56px)] font-medium leading-none">{n.value}</div>
          <div className="rd-eyebrow mt-2 text-[10px] text-earth-600">{n.label}</div>
        </div>
      ))}
    </div>
  )
}

/** Search and filters, one line on desktop, stacked on a phone. */
export function Toolbar({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mt-9 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 flex-wrap items-end gap-x-6 gap-y-4">{children}</div>
      {actions && <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap lg:justify-end">{actions}</div>}
    </div>
  )
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block w-full sm:w-[240px]">
      <span className={labelCls}>Search</span>
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={fieldCls} />
    </label>
  )
}

export function SelectField({ label, value, onChange, children, width = 'sm:w-[220px]' }: {
  label: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
  width?: string
}) {
  return (
    <label className={`block w-full ${width}`}>
      <span className={labelCls}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)} className={`${fieldCls} cursor-pointer`}>
        {children}
      </select>
    </label>
  )
}

/** List on the left, sheet on the right; on a phone the sheet goes below. */
export function Split({ list, sheet, sheetRef }: { list: ReactNode; sheet: ReactNode; sheetRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0">{list}</div>
      <div ref={sheetRef} className="min-w-0 scroll-mt-6 lg:sticky lg:top-6 lg:max-h-[calc(100svh-48px)] lg:self-start lg:overflow-y-auto">
        {sheet}
      </div>
    </div>
  )
}

export function Heading({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pb-3">
      <h2 className="rd-italic text-[28px] md:text-[32px]">{title}</h2>
      {meta != null && <span className="rd-eyebrow text-[10px] text-earth-500">{meta}</span>}
    </div>
  )
}

/**
 * A column of the list. `template` on CrmTable gives the widths; a column with
 * `wide` only shows from sm up, so the phone keeps name and one or two short values.
 */
export type Column = { label: ReactNode; wide?: boolean; align?: 'right' }

const cellVis = (c: Column) => `${c.wide ? 'hidden sm:block' : ''} ${c.align === 'right' ? 'text-right' : ''}`

export function CrmTable({ title, meta, columns, template, children, empty, isEmpty }: {
  title: ReactNode
  meta?: ReactNode
  columns: Column[]
  /** Tailwind grid-cols-[…] classes, the same for header and rows (mobile first, then sm:). */
  template: string
  children: ReactNode
  empty: string
  isEmpty: boolean
}) {
  return (
    <section>
      <Heading title={title} meta={meta} />
      <div role="table" className="border-t border-night">
        <div role="row" className={`grid ${template} items-end gap-x-4 border-b border-night/20 px-1 py-2.5`}>
          {columns.map((c, i) => (
            <span key={i} role="columnheader" className={`rd-eyebrow truncate text-[9px] text-earth-500 ${cellVis(c)}`}>{c.label}</span>
          ))}
        </div>
        {isEmpty ? <p className="py-8 text-[13px] text-earth-600">{empty}</p> : children}
      </div>
    </section>
  )
}

/** Cell class for a column, so a row hides the same columns as the header. */
export function cell(c: Column, extra = '') {
  return `min-w-0 truncate ${cellVis(c)} ${extra}`
}

/**
 * One line of the list. With `lead` (a checkbox), the lead keeps the first column
 * and the rest of the row is the button that opens the sheet (CSS subgrid).
 */
export function CrmRow({ template, selected, onOpen, lead, children, label }: {
  template: string
  selected: boolean
  onOpen: () => void
  lead?: ReactNode
  children: ReactNode
  label: string
}) {
  const btn = 'items-center gap-x-4 py-3.5 text-left transition-colors'
  return (
    <div role="row" className={`grid ${template} items-center gap-x-4 border-b border-night/20 px-1 ${selected ? 'bg-night/[0.05]' : 'hover:bg-night/[0.03]'}`}>
      {lead && <div className="flex items-center">{lead}</div>}
      <button
        type="button"
        onClick={onOpen}
        aria-current={selected || undefined}
        aria-label={label}
        className={`${lead ? 'col-[2/-1]' : 'col-[1/-1]'} grid grid-cols-subgrid ${btn}`}
      >
        {children}
      </button>
    </div>
  )
}

/** Name in Cormorant over a small Inter line: the first cell of every row. */
export function NameCell({ name, sub, tag }: { name: ReactNode; sub?: ReactNode; tag?: ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate font-serif text-[20px] font-medium leading-[1.15]">{name}</span>
        {tag}
      </span>
      {sub && <span className="mt-0.5 block truncate text-[12px] leading-[1.45] text-earth-600">{sub}</span>}
    </span>
  )
}

export function Sheet({ title, meta, children, actions }: { title: ReactNode; meta?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section>
      <Heading title={title} meta={meta} />
      <div className="border-t border-night">{children}</div>
      {actions && <div className="mt-5 flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}

export function SheetEmpty({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <Heading title={title} />
      <p className="border-t border-night py-8 text-[13px] text-earth-600">{text}</p>
    </section>
  )
}

/** A long value (motivation, notes): label on top, text below, never cut. */
export function BlockField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-b border-night/20 py-[11px]">
      <span className="rd-eyebrow block text-[10px] text-earth-500">{label}</span>
      <div className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-[1.6]">{children}</div>
    </div>
  )
}

/** Small uppercase tag next to a name (manual, member, sponsor…). */
export function Tag({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span title={title} className="shrink-0 rounded-full border border-night/40 px-2 py-[1px] text-[9px] font-semibold uppercase tracking-[0.14em] text-earth-700">
      {children}
    </span>
  )
}

/** Overlay for the CRM dialogs, in the board palette. */
export function Dialog({ title, sub, onClose, busy, children, wide }: {
  title: ReactNode
  sub?: ReactNode
  onClose: () => void
  busy?: boolean
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-night/60 p-4"
      onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}
    >
      <div role="dialog" aria-modal="true" className={`max-h-[90vh] w-full overflow-y-auto bg-ivory text-night shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-start justify-between gap-4 border-b border-night px-6 pb-4 pt-5">
          <div>
            <h3 className="rd-italic text-[28px]">{title}</h3>
            {sub && <p className="mt-1 text-[12px] text-earth-600">{sub}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rd-italic text-[18px] disabled:opacity-40">Close</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** On a phone the sheet sits below the list: bring it into view after a choice. */
export function revealSheet(el: HTMLElement | null) {
  if (el && window.innerWidth < 1024) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
}
