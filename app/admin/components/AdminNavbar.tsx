'use client'

import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Settings',    href: '/admin/settings'    },
  { label: 'Dashboard',   href: '/admin/dashboard'   },
  { label: 'People',      href: '/admin/people'      },
  { label: 'Archive',     href: '/admin/archive'     },
  { label: 'Candidature', href: '/admin/jobs'        },
  { label: 'Finance',     href: '/admin/finance'     },
] as const

export default function AdminNavbar({ userEmail: _ }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <nav
      className="sticky top-0 z-40 w-full bg-white flex items-center px-8"
      style={{ height: '56px', borderBottom: '1px solid #e5e5e5' }}
    >
      {/* Nav links */}
      <div className="flex items-stretch h-full flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {NAV.map(item => {
          const isActive = pathname.startsWith(item.href)
          return (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center px-4 text-[0.75rem] whitespace-nowrap transition-colors duration-100 flex-shrink-0"
              style={{
                letterSpacing: '0.1em',
                color: isActive ? '#1a4a3a' : '#4a4a4a',
                borderBottom: isActive ? '2px solid #1a4a3a' : '2px solid transparent',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {item.label}
            </a>
          )
        })}
      </div>

      {/* Back link */}
      <a
        href="/dashboard"
        className="flex-shrink-0 ml-8 transition-colors duration-100 hover:text-forest"
        style={{ fontSize: '0.75rem', color: '#4a4a4a', letterSpacing: '0.02em' }}
      >
        ← Back to Dashboard
      </a>
    </nav>
  )
}
