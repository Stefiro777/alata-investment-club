import type { IconName } from '@/app/components/member/icons'

/*
 * The five voices of the Board panel and the screens inside each one. The
 * existing admin tools are grouped under these voices instead of the old
 * ten-item admin bar.
 */
export type BoardTab = { href: string; label: string }
export type BoardSection = { key: string; label: string; href: string; icon: IconName; sub: string; tabs: BoardTab[] }

export const BOARD_SECTIONS: BoardSection[] = [
  {
    key: 'overview', label: 'Overview', href: '/admin', icon: 'home',
    sub: 'Where the club stands today.',
    tabs: [],
  },
  {
    key: 'site', label: 'Site', href: '/admin/content', icon: 'site',
    sub: 'Everything that appears on the public website.',
    tabs: [
      { href: '/admin/content', label: 'Content' },
      { href: '/admin/people', label: 'People and alumni' },
      { href: '/admin/partners', label: 'Partners' },
      { href: '/admin/featured-reports', label: 'Reports' },
      { href: '/admin/dashboard', label: 'Resources' },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
  {
    key: 'finance', label: 'Finance', href: '/admin/finance', icon: 'finance',
    sub: 'Transactions, budget and accounting documents.',
    tabs: [
      { href: '/admin/finance', label: 'Transactions and budget' },
      { href: '/admin/archive', label: 'Documents' },
    ],
  },
  {
    key: 'crm', label: 'CRM', href: '/admin/crm', icon: 'crm',
    sub: 'Members, applications, contacts and partners.',
    tabs: [
      { href: '/admin/crm', label: 'Members and contacts' },
      { href: '/admin/applications', label: 'Applications' },
      { href: '/admin/membership', label: 'Membership' },
    ],
  },
  {
    key: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: 'analytics',
    sub: 'The club’s own numbers and the quarterly archive.',
    tabs: [],
  },
]

export function sectionOf(pathname: string): BoardSection | null {
  if (pathname === '/admin') return BOARD_SECTIONS[0]
  return BOARD_SECTIONS.find(s => s.key !== 'overview' && s.tabs.concat({ href: s.href, label: '' }).some(t => pathname === t.href || pathname.startsWith(t.href + '/'))) ?? null
}
