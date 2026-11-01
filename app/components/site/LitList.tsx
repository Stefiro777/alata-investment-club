'use client'

import type { ReactNode } from 'react'

export type LitItem = { key: string; label: string }

/**
 * The "lit and unlit" list used by Events stories and Partners: the chosen
 * name is lit and larger, the others are dimmed. On narrow screens it can
 * become a horizontal row of names (`rowOnMobile`).
 */
export default function LitList({
  items,
  activeKey,
  onSelect,
  tone = 'dark',
  rowOnMobile = false,
  renderActiveExtra,
  ariaLabel,
}: {
  items: LitItem[]
  activeKey: string
  onSelect: (key: string) => void
  tone?: 'dark' | 'light'
  rowOnMobile?: boolean
  /** Rendered under the active name (e.g. the partners timer). */
  renderActiveExtra?: () => ReactNode
  ariaLabel?: string
}) {
  const on = tone === 'dark' ? 'text-ivory' : 'text-night'
  const off = tone === 'dark' ? 'text-ivory/45 hover:text-ivory/75' : 'text-night/40 hover:text-night/70'

  return (
    <ul
      aria-label={ariaLabel}
      className={rowOnMobile
        ? 'flex gap-7 overflow-x-auto pb-2 [scrollbar-width:none] md:block md:overflow-visible md:pb-0'
        : ''}
    >
      {items.map(item => {
        const active = item.key === activeKey
        return (
          <li key={item.key} className={rowOnMobile ? 'shrink-0 md:shrink' : ''}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-pressed={active}
              className={`rd-italic block text-left transition-[color,font-size] duration-300 ${
                active ? `${on} text-[28px] md:text-[34px]` : `${off} text-[22px] md:text-[26px]`
              } ${rowOnMobile ? 'whitespace-nowrap md:whitespace-normal' : ''} mb-3.5 leading-[1.15]`}
            >
              {item.label}
            </button>
            {active && renderActiveExtra?.()}
          </li>
        )
      })}
    </ul>
  )
}
