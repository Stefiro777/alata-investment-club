'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const NAV = [
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/content',  label: 'Content'  },
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/people',   label: 'People'   },
  { href: '/admin/partners', label: 'Partners'  },
] as const

export default function AdminShell({ userEmail, children }: { userEmail: string; children: ReactNode }) {
  const pathname = usePathname()
  const active = NAV.find(n => pathname.startsWith(n.href)) ?? NAV[0]

  return (
    <div className="min-h-screen bg-paper-stone flex">

      {/* ══ SIDEBAR (desktop) ══════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 bg-white border-r border-line-faint sticky top-0 h-screen overflow-y-auto">

        {/* Brand header */}
        <div className="bg-forest text-white px-4 py-5 flex-shrink-0">
          <p className="font-serif text-[15px] font-medium leading-tight">Admin Panel</p>
          <p className="text-white/50 text-[11px] mt-1 truncate">{userEmail}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                className={`w-full flex items-center px-4 py-3 text-sm transition-colors duration-100 ${
                  isActive ? 'bg-forest text-white font-medium' : 'text-[#374151] hover:bg-[#f3f4f6]'
                }`}
              >
                <span className="text-[11px] font-semibold tracking-widest uppercase">
                  {item.label}
                </span>
              </a>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-line-faint px-4 py-3 flex-shrink-0">
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-ink-500 hover:text-ink-900 transition-colors"
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Dashboard
          </a>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Mobile: green top bar */}
        <div className="lg:hidden bg-forest text-white px-4 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-serif text-base font-medium">Admin Panel</p>
            <p className="text-white/50 text-xs mt-0.5 truncate max-w-[200px]">{userEmail}</p>
          </div>
          <a
            href="/dashboard"
            className="border border-white/40 hover:bg-white/10 text-white text-xs font-medium tracking-wide uppercase px-3 py-1.5 transition-colors"
          >
            Dashboard
          </a>
        </div>

        {/* Mobile: section tabs */}
        <div className="lg:hidden bg-white border-b border-line-faint sticky top-0 z-10 flex-shrink-0">
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {NAV.map(item => {
              const isActive = pathname.startsWith(item.href)
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex-shrink-0 px-4 py-3 text-xs font-medium tracking-wide uppercase border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-forest text-forest'
                      : 'border-transparent text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {item.label}
                </a>
              )
            })}
          </div>
        </div>

        {/* Desktop: breadcrumb bar */}
        <div className="hidden lg:flex items-center gap-2 px-6 py-3 bg-white border-b border-line-faint text-xs text-ink-500 flex-shrink-0">
          <span className="font-semibold uppercase tracking-widest text-[#374151]">
            {active.label}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1">
          {children}
        </div>

      </div>
    </div>
  )
}
