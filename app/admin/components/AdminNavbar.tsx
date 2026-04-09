'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Settings',  href: '/admin/settings'  },
  { label: 'Content',   href: '/admin/content'   },
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'People',    href: '/admin/people'    },
  { label: 'Partners',  href: '/admin/partners'  },
] as const

export default function AdminNavbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-black/10 flex items-stretch">
      {/* Brand */}
      <div className="flex-shrink-0 bg-[#1a4a3a] text-white px-5 py-3 flex flex-col justify-center min-w-[160px]">
        <p className="font-serif text-[15px] font-medium leading-tight">Admin Panel</p>
        <p className="text-white/60 text-[11px] mt-0.5 truncate max-w-[180px]">{userEmail}</p>
      </div>

      {/* Nav links */}
      <div className="flex items-stretch flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {NAV.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center px-5 py-3 text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap transition-colors duration-100 border-b-2 ${
                isActive
                  ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                  : 'text-[#374151] hover:bg-[#f3f4f6] border-transparent'
              }`}
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {/* Right side — back to dashboard */}
      <div className="flex items-center px-4 flex-shrink-0">
        <a
          href="/dashboard"
          className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-[11px] font-semibold tracking-widest uppercase px-4 py-2 transition-colors duration-150"
        >
          Dashboard
        </a>
      </div>
    </nav>
  )
}
