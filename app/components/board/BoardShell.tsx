'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Icons, type IconName } from '@/app/components/member/icons'
import { BOARD_SECTIONS, sectionOf } from './sections'

/**
 * Board panel shell (boards board/*): the five voices on a dark sidebar on
 * desktop, a fixed bar at the bottom on mobile. Hackathon lives apart, under
 * Tools. Access is checked on the server by app/admin/layout.tsx.
 */
export default function BoardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const current = sectionOf(pathname)

  async function logout() {
    setLoggingOut(true)
    await createClient().auth.signOut()
    router.push('/login')
  }

  const item = (href: string, label: string, icon: IconName, on: boolean) => {
    const Icon = Icons[icon]
    return (
      <Link
        key={href}
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`flex items-center gap-3.5 px-6 py-3 font-serif text-[21px] font-medium transition-colors ${on ? 'bg-ivory/10 text-ivory' : 'text-ivory/70 hover:text-ivory'}`}
      >
        <Icon />
        {label}
      </Link>
    )
  }

  return (
    <div className="rd-app rd-board min-h-screen bg-ivory text-night">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] flex-col bg-night text-ivory lg:flex">
        <div className="px-6 pt-[26px]">
          <Link href="/" className="block w-fit leading-none" aria-label="Alata Investment Club, website">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/redesign/logo-light.png" alt="Alata" className="h-10 w-auto" />
          </Link>
          <div className="rd-eyebrow mt-5 text-[10px] text-ivory/50">Board panel</div>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Board panel">
          {BOARD_SECTIONS.map(s => item(s.href, s.label, s.icon, current?.key === s.key))}
          <div className="rd-eyebrow px-6 pb-2 pt-[26px] text-[10px] text-ivory/45">Tools</div>
          {item('/admin/hackathon', 'Hackathon', 'tools', pathname.startsWith('/admin/hackathon'))}
        </nav>
        <div className="flex flex-col gap-3 px-6 pb-8 pt-6 text-[13px] text-ivory/70">
          <Link href="/dashboard" className="hover:text-ivory">Back to member area</Link>
          <button type="button" onClick={logout} disabled={loggingOut} className="text-left hover:text-ivory disabled:opacity-50">
            {loggingOut ? 'Logging out…' : 'Log out'}
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between px-5 pt-5 lg:hidden">
        <Link href="/dashboard" aria-label="Back to member area">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-dark.png" alt="Alata" className="h-[34px] w-auto" />
        </Link>
        <div className="flex items-center gap-5 text-[13px]">
          <Link href="/admin/hackathon">Hackathon</Link>
          <Link href="/dashboard">Member area</Link>
        </div>
      </header>

      <main className="min-w-0 px-5 pb-[110px] pt-6 lg:ml-[230px] lg:px-12 lg:pb-16 lg:pt-11">
        <div className="mx-auto max-w-[1100px]">{children}</div>
      </main>

      <nav aria-label="Board panel" className="fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-center justify-around bg-night px-2 pb-2 text-ivory lg:hidden">
        {BOARD_SECTIONS.map(s => {
          const on = current?.key === s.key
          const Icon = Icons[s.icon]
          return (
            <Link key={s.key} href={s.href} aria-current={on ? 'page' : undefined} className={`flex flex-col items-center gap-[5px] text-[10px] tracking-[0.06em] ${on ? 'text-ivory' : 'text-ivory/55'}`}>
              <Icon />
              {s.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
