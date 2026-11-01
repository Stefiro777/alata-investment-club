'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Pages already moved to the redesign render their own SiteNav / SiteFooter
 * (or the member and board shells). The old header and footer stay only on
 * the pages that have not been converted yet. Exact paths, or prefixes
 * ending in '/'.
 */
const REDESIGNED: string[] = ['/', '/events', '/events/', '/reports', '/team', '/team/alumni', '/career-service', '/join-us', '/partners', '/merch', '/merch/', '/checkout', '/checkout/', '/login', '/forgot-password', '/reset-password', '/update-password', '/accept-invite', '/verify/', '/privacy-policy', '/dashboard', '/dashboard/', '/admin', '/admin/']

export function isRedesigned(pathname: string) {
  return REDESIGNED.some(p => (p.endsWith('/') && p !== '/' ? pathname.startsWith(p) : pathname === p))
}

export default function LegacyChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (isRedesigned(pathname)) return null
  return <>{children}</>
}
