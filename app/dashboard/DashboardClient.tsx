'use client'

import React, { useState, useEffect } from 'react'
import type { Resource } from '@/lib/types'
import CalendarEventsList from './CalendarEventsList'

type View = 'welcome' | 'masters' | 'career' | 'education' | 'forbes' | 'documenti'

const CATEGORIES: {
  id: Exclude<View, 'welcome'>
  label: string
  description: string
  icon: (p: { className?: string }) => React.ReactElement
}[] = [
  {
    id: 'masters',
    label: 'Masters',
    description: 'Guide, classifiche e risorse per i master',
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    id: 'career',
    label: 'Career & Recruiting',
    description: 'Prep colloqui, orientamento e documenti di carriera',
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Training Academy, libri, corsi e metodo di studio',
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'forbes',
    label: 'Forbes Next Leaders',
    description: 'Materiale esclusivo del programma Forbes',
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'documenti',
    label: 'Documenti Alata',
    description: 'Presentazioni, risorse e documenti ufficiali',
    icon: ({ className }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  masters: 'Masters',
  career: 'Career & Recruiting',
  education: 'Education',
  forbes: 'Forbes Next Leaders',
  documenti: 'Documenti Alata',
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group p-6 border border-line-faint hover:border-forest bg-white flex flex-col gap-4 transition-colors duration-fast h-full"
    >
      <div className="w-10 h-10 bg-paper-stone flex items-center justify-center group-hover:bg-forest transition-colors duration-fast flex-shrink-0">
        {resource.is_folder
          ? <FolderIcon className="w-5 h-5 text-forest group-hover:text-white transition-colors duration-fast" />
          : <FileIcon className="w-5 h-5 text-forest group-hover:text-white transition-colors duration-fast" />
        }
      </div>
      <div className="flex-1">
        <p className="font-serif text-lg font-semibold text-ink-900 group-hover:text-forest leading-snug transition-colors duration-fast">
          {resource.title}
        </p>
        {resource.description && (
          <p className="text-sm text-ink-500 mt-1 leading-relaxed">{resource.description}</p>
        )}
      </div>
      <svg className="w-4 h-4 text-ink-400 group-hover:text-forest mt-auto transition-colors duration-fast" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    </a>
  )
}

function subId(name: string) {
  return `sub-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

// ── Welcome view ──────────────────────────────────────────────────────────────

function WelcomeView({
  displayName,
  resources,
  onNavigate,
}: {
  displayName: string
  resources: Resource[]
  onNavigate: (view: Exclude<View, 'welcome'>, sub?: string) => void
}) {
  const countByCategory = (cat: string) => resources.filter(r => r.category === cat).length
  const recent = [...resources]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  function subcatsForCat(catId: string) {
    const catRes = resources.filter(r => r.category === catId)
    return Array.from(new Set(catRes.map(r => r.subcategory).filter(Boolean) as string[]))
      .sort((a, b) => {
        const min = (name: string) => Math.min(...catRes.filter(r => r.subcategory === name).map(r => r.subcategory_order ?? 0))
        return min(a) - min(b)
      })
  }

  return (
    <div className="py-16 sm:py-20">
      {/* Greeting */}
      <div className="mb-14">
        <p className="text-xs tracking-[0.2em] uppercase text-forest mb-3">Members Area</p>
        <h2 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-4">
          Welcome back, {displayName}
        </h2>
        <div className="w-12 h-px bg-forest mb-8" />
        <p className="font-serif italic text-2xl sm:text-3xl text-ink-900/70 leading-snug">
          &ldquo;Great investments start with great people.&rdquo;
        </p>
      </div>

      {/* Notion Workspace */}
      <div className="mb-10">
        <a
          href="https://www.notion.so/Alata-Investment-Club-3c27ba5ab1374113b820efffa536723e"
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-white border border-line-faint hover:border-forest hover:shadow-md px-5 py-3.5 inline-flex items-center gap-4 transition-all duration-150"
        >
          <div className="flex-1">
            <p className="font-serif text-base font-bold text-forest leading-snug">Notion Workspace</p>
            <p className="text-xs text-gray-500 leading-relaxed">Tracks all tasks assigned to the club&apos;s divisions.</p>
          </div>
          <span className="text-xs font-medium text-forest tracking-wide group-hover:underline flex-shrink-0">Open →</span>
        </a>
      </div>

      {/* Deadlines & Events */}
      <div className="mb-14">
        <div className="flex items-end justify-between gap-4 mb-1">
          <h3 className="font-serif text-2xl font-bold text-ink-900">Deadlines &amp; Events</h3>
          <a
            href="https://www.notion.so/1c4baca2197248999054618cc7f2e8dc?v=32d8bea508ff46bba4d91f5685762c69"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-forest hover:underline flex items-center gap-1 flex-shrink-0 pb-0.5"
          >
            Open Master Calendar in Notion
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <div className="w-8 h-px bg-forest mb-4" />
        <CalendarEventsList />
      </div>

      {/* Quick access cards */}
      <div className="mb-16">
        <h3 className="font-serif text-2xl font-bold text-ink-900 mb-1">Club Resources</h3>
        <div className="w-8 h-px bg-forest mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            const count = countByCategory(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => onNavigate(cat.id)}
                className="group text-left p-5 border border-line-faint hover:border-forest bg-white transition-colors duration-fast"
              >
                <div className="w-10 h-10 bg-paper-stone group-hover:bg-forest flex items-center justify-center transition-colors duration-fast mb-4">
                  <Icon className="w-5 h-5 text-forest group-hover:text-white transition-colors duration-fast" />
                </div>
                <p className="font-serif text-base font-bold text-ink-900 group-hover:text-forest transition-colors leading-tight mb-1">
                  {cat.label}
                </p>
                <p className="text-xs text-ink-400">{count} {count === 1 ? 'resource' : 'resources'}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recently added */}
      {recent.length > 0 && (
        <div>
          <h3 className="font-serif text-2xl font-bold text-ink-900 mb-1">Recently Added</h3>
          <div className="w-8 h-px bg-forest mb-6" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {recent.map(r => (
              <div key={r.id} className="relative h-full">
                <span className="absolute top-3 right-3 text-[10px] font-medium tracking-wider uppercase text-white bg-forest px-2 py-0.5 z-10">
                  {CATEGORY_LABELS[r.category] ?? r.category}
                </span>
                <ResourceCard resource={r} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full index */}
      {CATEGORIES.some(c => resources.some(r => r.category === c.id)) && (
        <div className="mt-16 pt-10 border-t border-line-faint">
          <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-8">All Sections</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-8">
            {CATEGORIES.map(cat => {
              const hasResources = resources.some(r => r.category === cat.id)
              if (!hasResources) return null
              const subs = subcatsForCat(cat.id)
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => onNavigate(cat.id)}
                    className="font-serif text-sm font-bold text-ink-900 hover:text-forest transition-colors text-left leading-snug mb-3 block"
                  >
                    {cat.label}
                  </button>
                  {subs.length > 0 && (
                    <ul className="space-y-2">
                      {subs.map(sub => (
                        <li key={sub}>
                          <button
                            onClick={() => onNavigate(cat.id, sub)}
                            className="text-xs text-ink-500 hover:text-forest transition-colors text-left leading-snug"
                          >
                            {sub}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Collapsible subcategory group ─────────────────────────────────────────────

function SubcategoryGroup({ name, resources }: { name: string; resources: Resource[] }) {
  const [open, setOpen] = useState(true)
  return (
    <div id={subId(name)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full text-left mb-0 group"
      >
        <h3 className="font-serif text-xl font-bold text-ink-900 group-hover:text-forest transition-colors">
          {name}
        </h3>
        <span className="text-xs text-ink-400">{resources.length}</span>
        <svg
          className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0 ml-auto"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div className="w-8 h-px bg-forest mt-2 mb-5" />
      <div
        style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}
      >
        <div style={{ overflow: 'hidden' }}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-1">
            {resources.map(r => <ResourceCard key={r.id} resource={r} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Section view ──────────────────────────────────────────────────────────────

function SectionView({
  view,
  resources,
  targetSub,
  onBack,
}: {
  view: Exclude<View, 'welcome'>
  resources: Resource[]
  targetSub: string | null
  onBack: () => void
}) {
  useEffect(() => {
    if (!targetSub) return
    const id = subId(targetSub)
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
    return () => clearTimeout(t)
  }, [targetSub])
  const cat = CATEGORIES.find(c => c.id === view)!
  const sectionResources = resources
    .filter(r => r.category === view)
    .sort((a, b) => {
      if (a.order_index != null && b.order_index != null) return a.order_index - b.order_index
      if (a.order_index != null) return -1
      if (b.order_index != null) return 1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })

  const subcategoryNames = Array.from(
    new Set(sectionResources.map(r => r.subcategory).filter(Boolean) as string[])
  ).sort((a, b) => {
    const minOrder = (name: string) => Math.min(
      ...sectionResources
        .filter(r => r.subcategory === name)
        .map(r => r.subcategory_order ?? 0)
    )
    return minOrder(a) - minOrder(b)
  })

  const ungrouped = sectionResources.filter(r => !r.subcategory)
  const hasGroups = subcategoryNames.length > 0

  return (
    <div className="py-12 sm:py-16">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-medium text-ink-500 hover:text-forest transition-colors mb-10 uppercase tracking-wide"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Exclusive Access</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-1">{cat.label}</h2>
        <div className="w-10 h-px bg-forest mt-3 mb-4" />
        <p className="text-sm text-ink-500">{cat.description}</p>
      </div>

      {hasGroups && (
        <div className="flex flex-wrap gap-2 mb-10">
          {subcategoryNames.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => document.getElementById(subId(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-4 py-1.5 text-xs font-medium tracking-wide border border-forest text-forest hover:bg-forest hover:text-white transition-colors duration-fast"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {sectionResources.length === 0 ? (
        <p className="text-sm text-ink-500">No resources yet.</p>
      ) : hasGroups ? (
        <div className="space-y-10">
          {/* Ungrouped resources first (no subcategory) */}
          {ungrouped.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ungrouped.map(r => <ResourceCard key={r.id} resource={r} />)}
            </div>
          )}
          {/* Subcategory groups */}
          {subcategoryNames.map(name => (
            <SubcategoryGroup
              key={name}
              name={name}
              resources={sectionResources.filter(r => r.subcategory === name)}
            />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectionResources.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DashboardClient({
  displayName,
  resources,
}: {
  displayName: string
  resources: Resource[]
}) {
  const [view, setView] = useState<View>('welcome')
  const [targetSub, setTargetSub] = useState<string | null>(null)

  function handleNavigate(cat: Exclude<View, 'welcome'>, sub?: string) {
    setTargetSub(sub ?? null)
    setView(cat)
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8">
      {view === 'welcome' ? (
        <WelcomeView
          displayName={displayName}
          resources={resources}
          onNavigate={handleNavigate}
        />
      ) : (
        <SectionView
          view={view}
          resources={resources}
          targetSub={targetSub}
          onBack={() => { setView('welcome'); setTargetSub(null) }}
        />
      )}
    </div>
  )
}
