'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { sectionOf } from '@/app/components/board/sections'

/**
 * Heading of a Board panel screen: the voice (Site, Finance, CRM…) with its
 * line and the pill tabs of the screens grouped under it. The sidebar is in
 * BoardShell. Kept under this name because every admin page renders it.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function AdminNavbar(_props: { userEmail?: string }) {
  const pathname = usePathname()
  const section = sectionOf(pathname)
  if (!section) {
    if (!pathname.startsWith('/admin/hackathon')) return null
    return (
      <div className="mb-8">
        <h1 className="rd-display text-[clamp(40px,4.6vw,54px)]">Hackathon</h1>
        <p className="mt-3 text-[14px] leading-[1.6] text-earth-600">Sessions, participants, materials and judging of the M&amp;A game.</p>
      </div>
    )
  }
  return (
    <div className="mb-8">
      <h1 className="rd-display text-[clamp(40px,4.6vw,54px)]">{section.label}</h1>
      <p className="mt-3 text-[14px] leading-[1.6] text-earth-600">{section.sub}</p>
      {section.tabs.length > 1 && (
        <nav className="mt-6 flex flex-wrap gap-2" aria-label={`${section.label} screens`}>
          {section.tabs.map(t => {
            const on = pathname === t.href || pathname.startsWith(t.href + '/')
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? 'page' : undefined}
                className={`rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors ${on ? 'border-night bg-night text-ivory' : 'border-night/50 hover:border-night'}`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
