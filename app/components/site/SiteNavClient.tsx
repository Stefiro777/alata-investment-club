'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCart } from '@/app/components/CartContext'

export type NavTone = 'dark' | 'light'

const LINKS = [
  { href: '/', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/reports', label: 'Reports' },
  { href: '/team', label: 'Team' },
  { href: '/career-service', label: 'Career' },
  { href: '/partners', label: 'Partners' },
  { href: '/merch', label: 'Merch' },
  { href: '/join-us', label: 'Join' },
] as const

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function SiteNavClient({
  tone,
  bigLogo,
  merchVisible,
}: {
  tone: NavTone
  bigLogo: boolean
  merchVisible: boolean
}) {
  const pathname = usePathname()
  const { count, openDrawer } = useCart()
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()

  const links = LINKS.filter(l => l.href !== '/merch' || merchVisible)
  const onShop = pathname.startsWith('/merch') || pathname.startsWith('/checkout')
  const showCart = onShop || count > 0
  const fg = tone === 'dark' ? 'text-ivory' : 'text-night'

  // Lock the page while the mobile menu is open.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <header className={`absolute inset-x-0 top-0 z-40 ${fg}`}>
      <nav className="rd-gutter flex items-center justify-between pt-6 md:pt-[30px]" aria-label="Main">
        <Link href="/" className="block leading-none" aria-label="Alata Investment Club, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tone === 'dark' ? '/redesign/logo-light.png' : '/redesign/logo-dark.png'}
            alt="Alata"
            width={800}
            height={431}
            className={`block w-auto ${bigLogo ? 'h-[34px] md:h-[44px]' : 'h-[34px] md:h-10'}`}
          />
        </Link>

        <div className="hidden lg:flex h-10 items-center gap-[26px] text-[13px] font-medium tracking-[0.04em]">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(pathname, l.href) ? 'page' : undefined}
              className={`underline-offset-[6px] decoration-1 hover:underline ${isActive(pathname, l.href) ? 'underline' : ''}`}
            >
              {l.label}
            </Link>
          ))}
          {showCart && (
            <button type="button" onClick={openDrawer} className="hover:underline underline-offset-[6px]">
              Cart ({count})
            </button>
          )}
          <Link href="/login" className="rounded-full border border-current px-[18px] py-2 transition-colors hover:bg-current/10">
            Log in
          </Link>
        </div>

        <div className="flex items-center gap-5 lg:hidden">
          {showCart && (
            <button type="button" onClick={openDrawer} className="text-[13px] font-medium tracking-[0.04em]">
              Cart ({count})
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-m-3 p-3"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path d="M3 8h18M3 16h18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            key="menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col bg-night text-ivory lg:hidden"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="rd-gutter flex items-center justify-between pt-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/redesign/logo-light.png" alt="Alata" width={800} height={431} className="h-[34px] w-auto" />
              <button type="button" onClick={() => setOpen(false)} className="-m-3 p-3" aria-label="Close menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <ul className="rd-gutter mt-10 flex-1 overflow-y-auto pb-8">
              {links.map(l => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`rd-display block py-2 text-[40px] ${isActive(pathname, l.href) ? 'italic' : 'text-ivory/70'}`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="rd-gutter pb-10">
              <Link href="/login" onClick={() => setOpen(false)} className="inline-block rounded-full border border-ivory px-6 py-3 text-[13px] font-medium tracking-[0.04em]">
                Log in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
