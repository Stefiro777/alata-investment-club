'use client'

import { useState, useEffect } from 'react'
import AdminClient from './AdminClient'
import MembersClient from './members/MembersClient'
import FeaturedReportsClient from './featured-reports/FeaturedReportsClient'
import TeamClient from './team/TeamClient'
import type { Alumni, AlumniCompany, Resource, Partner, FeaturedReport } from '@/lib/types'
import type { TeamMember } from './team/page'

// Mirrors AdminClient's local Contenuto type (structural match)
type Contenuto = {
  id: number
  titolo: string
  descrizione: string | null
  short_description: string | null
  full_description: string | null
  tag: string | null
  tipo: string
  data_pubblicazione: string | null
  link: string | null
  immagine_url: string | null
  photos: string[] | null
}

// ── Navigation structure ───────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'people',
    label: 'People',
    tabs: [
      { id: 'board', label: 'Board & Management' },
      { id: 'alumni', label: 'Alumni' },
      { id: 'alumni-companies', label: 'Alumni Companies' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    tabs: [
      { id: 'news', label: 'News & Events' },
      { id: 'featured-reports', label: 'Featured Reports' },
    ],
  },
  {
    id: 'partners',
    label: 'Partners',
    tabs: [{ id: 'partners', label: 'Partners' }],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    tabs: [{ id: 'resources', label: 'Risorse Dashboard' }],
  },
  {
    id: 'settings',
    label: 'Settings',
    tabs: [
      { id: 'invite', label: 'Invite Member' },
      { id: 'admin-users', label: 'Admin Users' },
      { id: 'apps-toggle', label: 'Applications Open' },
      { id: 'alumni-toggle', label: 'Show Alumni Page' },
    ],
  },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

// After navigating to a tab, scroll to the corresponding section inside the panel
const SCROLL_TARGETS: Record<string, string> = {
  'people/alumni': 'alumni',
  'people/alumni-companies': 'alumni-companies',
  'content/news': 'news-events',
  'partners/partners': 'partners',
  'dashboard/resources': 'resources',
  'settings/invite': 'invite-member',
  'settings/admin-users': 'admin-users',
  'settings/apps-toggle': 'settings',
  'settings/alumni-toggle': 'settings',
}

type Panel = 'team' | 'members' | 'admin' | 'featured-reports'

function getPanel(section: string, tab: string): Panel {
  if (section === 'people' && tab === 'board') return 'team'
  if (section === 'content' && tab === 'featured-reports') return 'featured-reports'
  if (section === 'people' || section === 'settings') return 'members'
  return 'admin'
}

// ── Prop types ────────────────────────────────────────────────────────────────

type AdminShellProps = {
  userEmail: string
  initialSection: string
  initialTab: string
  // AdminClient
  items: Contenuto[]
  resources: Resource[]
  partners: Partner[]
  // MembersClient
  adminUsers: string[]
  superadmin: string
  applicationsOpen: boolean
  showPrices: boolean
  priceCV: string
  priceMaster: string
  priceCareer: string
  showAlumni: boolean
  alumni: Alumni[]
  alumniCompanies: AlumniCompany[]
  // FeaturedReportsClient
  reports: FeaturedReport[]
  // TeamClient
  teamMembers: TeamMember[]
}

// ── Chevron icon ──────────────────────────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="w-3 h-3 text-[#9ca3af] flex-shrink-0 transition-transform duration-150"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminShell({
  userEmail, initialSection, initialTab,
  items, resources, partners,
  adminUsers, superadmin, applicationsOpen, showPrices,
  priceCV, priceMaster, priceCareer, showAlumni,
  alumni, alumniCompanies, reports, teamMembers,
}: AdminShellProps) {

  // Normalize initial params against the SECTIONS config
  const resolvedSection = SECTIONS.find(s => s.id === initialSection) ? initialSection : 'people'
  const resolvedSection$ = SECTIONS.find(s => s.id === resolvedSection)!
  const resolvedTab = resolvedSection$.tabs.find((t) => t.id === initialTab)
    ? initialTab
    : resolvedSection$.tabs[0].id

  const [activeSection, setActiveSection] = useState(resolvedSection)
  const [activeTab, setActiveTab] = useState(resolvedTab)
  // All sections expanded by default
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(SECTIONS.map(s => s.id))
  )

  function navigate(section: string, tab: string) {
    setActiveSection(section)
    setActiveTab(tab)
    setOpenSections(prev => new Set([...prev, section]))
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', `/admin?section=${section}&tab=${tab}`)
    }
  }

  function toggleSection(sectionId: string) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) { next.delete(sectionId) } else { next.add(sectionId) }
      return next
    })
  }

  // Scroll to the relevant anchor inside the active panel after navigation
  useEffect(() => {
    const target = SCROLL_TARGETS[`${activeSection}/${activeTab}`]
    if (!target) return
    const timer = setTimeout(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 160)
    return () => clearTimeout(timer)
  }, [activeSection, activeTab])

  const panel = getPanel(activeSection, activeTab)
  const currentSection = SECTIONS.find(s => s.id === activeSection)!
  const activeTabLabel = currentSection.tabs.find((t) => t.id === activeTab)?.label ?? ''

  const membersProps = {
    adminUsers, superadmin, applicationsOpen, showPrices,
    priceCV, priceMaster, priceCareer, showAlumni,
    alumni, alumniCompanies,
  }

  // ── Sidebar tab item ──────────────────────────────────────────────────────

  function SidebarTab({ sectionId, tabId, label }: { sectionId: string; tabId: string; label: string }) {
    const isActive = activeSection === sectionId && activeTab === tabId
    return (
      <button
        onClick={() => navigate(sectionId, tabId)}
        className={`w-full text-left pl-6 pr-3 py-2 text-sm transition-colors duration-100 ${
          isActive ? 'bg-[#1a4a3a] text-white font-medium' : 'text-[#374151] hover:bg-[#f3f4f6]'
        }`}
      >
        {label}
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">

      {/* ══ SIDEBAR (desktop) ══════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0 bg-white border-r border-black/10 sticky top-0 h-screen overflow-y-auto">

        {/* Brand header */}
        <div className="bg-[#1a4a3a] text-white px-4 py-5 flex-shrink-0">
          <p className="font-serif text-[15px] font-medium leading-tight">Admin Panel</p>
          <p className="text-white/50 text-[11px] mt-1 truncate">{userEmail}</p>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {SECTIONS.map(section => {
            const isOpen = openSections.has(section.id)
            return (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-[#f9fafb] transition-colors"
                >
                  <span className="text-[11px] font-semibold tracking-widest uppercase text-[#6b7280]">
                    {section.label}
                  </span>
                  <Chevron open={isOpen} />
                </button>
                {isOpen && (
                  <div className="pb-1">
                    {section.tabs.map(tab => (
                      <SidebarTab
                        key={tab.id}
                        sectionId={section.id}
                        tabId={tab.id}
                        label={tab.label}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-black/10 px-4 py-3 flex-shrink-0">
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
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
        <div className="lg:hidden bg-[#1a4a3a] text-white px-4 py-4 flex items-center justify-between flex-shrink-0">
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

        {/* Mobile: section tabs + sub-tabs */}
        <div className="lg:hidden bg-white border-b border-black/10 sticky top-0 z-10 flex-shrink-0">
          {/* Section row */}
          <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => navigate(section.id, section.tabs[0].id)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-medium tracking-wide uppercase border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-[#1a4a3a] text-[#1a4a3a]'
                    : 'border-transparent text-[#6b7280] hover:text-[#0a0a0a]'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
          {/* Sub-tab row (only when section has >1 tab) */}
          {currentSection.tabs.length > 1 && (
            <div className="flex overflow-x-auto bg-[#f9fafb] border-t border-black/5" style={{ scrollbarWidth: 'none' }}>
              {currentSection.tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => navigate(activeSection, tab.id)}
                  className={`flex-shrink-0 px-4 py-2.5 text-xs transition-colors whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'border-[#1a4a3a] text-[#1a4a3a] font-medium'
                      : 'border-transparent text-[#6b7280] hover:text-[#0a0a0a]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop: breadcrumb bar */}
        <div className="hidden lg:flex items-center gap-2 px-6 py-3 bg-white border-b border-black/10 text-xs text-[#6b7280] flex-shrink-0">
          <span className="font-semibold uppercase tracking-widest text-[#374151]">
            {currentSection.label}
          </span>
          <svg className="w-3 h-3 text-[#d1d5db]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{activeTabLabel}</span>
        </div>

        {/* ── Panels ── */}
        <div className="flex-1">
          {panel === 'team' && <TeamClient members={teamMembers} />}
          {panel === 'members' && <MembersClient {...membersProps} />}
          {panel === 'admin' && <AdminClient items={items} resources={resources} partners={partners} />}
          {panel === 'featured-reports' && <FeaturedReportsClient reports={reports} />}
        </div>

      </div>
    </div>
  )
}
