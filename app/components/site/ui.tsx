import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/* Shared primitives of the redesigned public pages. Rounded pills replace
   the old square buttons: outline on dark grounds, solid night only on ivory. */

type Tone = 'dark' | 'light'

/** Small uppercase status pill (Open / Soon / Members only). */
export function StatusPill({
  children,
  solid = false,
  tone = 'light',
  className = '',
}: {
  children: ReactNode
  solid?: boolean
  tone?: Tone
  className?: string
}) {
  const palette = tone === 'light'
    ? solid ? 'bg-club text-ivory border-club' : 'border-club text-club'
    : solid ? 'bg-ivory text-night border-ivory' : 'border-ivory/70 text-ivory'
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full border px-[15px] py-[7px] text-[10px] font-semibold uppercase leading-none tracking-[0.14em] ${palette} ${className}`}
    >
      {children}
    </span>
  )
}

/** Pill button / link. `tone` is the ground it sits on. */
export function PillLink({
  tone = 'dark',
  solid = false,
  className = '',
  children,
  ...props
}: ComponentProps<typeof Link> & { tone?: Tone; solid?: boolean }) {
  return (
    <Link {...props} className={`${pillClass(tone, solid)} ${className}`}>
      {children}
    </Link>
  )
}

export function pillClass(tone: Tone = 'dark', solid = false) {
  const base = 'inline-flex items-center gap-2.5 rounded-full border px-[30px] py-[15px] text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  if (tone === 'dark') return `${base} border-ivory/70 text-ivory hover:bg-ivory/10`
  return solid
    ? `${base} border-night bg-night text-ivory hover:bg-moss`
    : `${base} border-night text-night hover:bg-night/5`
}

/** The italic Cormorant call to action that most boards use instead of a button. */
export function ItalicLink({
  className = '',
  size = 'md',
  children,
  ...props
}: ComponentProps<typeof Link> & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <Link {...props} className={`${italicCtaClass(size)} ${className}`}>
      {children}
    </Link>
  )
}

export function italicCtaClass(size: 'sm' | 'md' | 'lg' | 'xl' = 'md') {
  const sizes = {
    sm: 'text-[24px] md:text-[28px]',
    md: 'text-[30px] md:text-[36px]',
    lg: 'text-[36px] md:text-[48px]',
    xl: 'text-[44px] md:text-[72px]',
  }
  return `rd-italic inline-block underline-offset-[0.18em] decoration-1 hover:underline ${sizes[size]}`
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rd-eyebrow ${className}`}>{children}</div>
}

/** Small italic caption placed under or beside a photo (place, event). */
export function Caption({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rd-italic text-[16px] ${className}`}>{children}</div>
}

export function LinkedInIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
