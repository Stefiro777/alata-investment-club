'use client'

import { useState, useEffect } from 'react'
import type { Resource } from '@/lib/types'

type View = 'welcome' | 'masters' | 'career' | 'education' | 'documenti'

const CATEGORIES: { id: Exclude<View, 'welcome'>; label: string; description: string }[] = [
  { id: 'masters', label: 'Masters', description: 'Guides, rankings and resources for the master programmes.' },
  { id: 'career', label: 'Career & Recruiting', description: 'Interview preparation, orientation and career documents.' },
  { id: 'education', label: 'Education', description: 'Training Academy, books, courses and study method.' },
  { id: 'documenti', label: 'Alata documents', description: 'Presentations, notes and official documents.' },
]

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

const count = (n: number) => `${n} ${n === 1 ? 'resource' : 'resources'}`

function subId(name: string) {
  return `sub-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

/** Board ACad: title in Cormorant, a line of description, a small-caps kind, "Open" in italics. */
function ResourceRow({ resource, category }: { resource: Resource; category?: string }) {
  const kind = [category, resource.is_folder ? 'Folder' : 'Document'].filter(Boolean).join(' · ')
  return (
    <li className="border-b border-night/20">
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start justify-between gap-6 py-5"
      >
        <span className="min-w-0">
          <span className="rd-display block text-[24px] leading-[1.15] group-hover:underline underline-offset-[0.18em]">{resource.title}</span>
          {resource.description && <span className="mt-1.5 block text-[13px] leading-[1.55] text-earth-700">{resource.description}</span>}
          <span className="rd-eyebrow mt-2 block text-[10px] text-earth-500">{kind}</span>
        </span>
        <span className="rd-italic shrink-0 pt-1 text-[24px]">Open</span>
      </a>
    </li>
  )
}

// ── Welcome view: the folders as typographic rows ─────────────────────────────

function WelcomeView({ resources, onNavigate }: { resources: Resource[]; onNavigate: (view: Exclude<View, 'welcome'>, sub?: string) => void }) {
  const shown = CATEGORIES.filter(c => resources.some(r => r.category === c.id))
  const recent = [...resources]
    .filter(r => r.category in CATEGORY_LABELS)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  function subcats(catId: string) {
    const catRes = resources.filter(r => r.category === catId)
    const min = (name: string) => Math.min(...catRes.filter(r => r.subcategory === name).map(r => r.subcategory_order ?? 0))
    return Array.from(new Set(catRes.map(r => r.subcategory).filter(Boolean) as string[])).sort((a, b) => min(a) - min(b))
  }

  return (
    <div className="py-6">
      <ul className="border-t border-night">
        {shown.map(cat => {
          const n = resources.filter(r => r.category === cat.id).length
          const subs = subcats(cat.id)
          return (
            <li key={cat.id} className="border-b border-night/20">
              <button
                type="button"
                onClick={() => onNavigate(cat.id)}
                className="group flex w-full items-baseline justify-between gap-6 py-5 text-left"
              >
                <span className="min-w-0">
                  <span className="rd-display block text-[clamp(28px,3vw,36px)] leading-[1.1] group-hover:underline underline-offset-[0.18em]">{cat.label}</span>
                  {subs.length > 0 && <span className="mt-1.5 block text-[13px] leading-[1.5] text-earth-700">{subs.join(' · ')}</span>}
                </span>
                <span className="flex shrink-0 items-baseline gap-5">
                  <span className="rd-eyebrow text-[10px] text-earth-500">{count(n)}</span>
                  <span className="rd-italic text-[24px]">Open</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {recent.length > 0 && (
        <div className="mt-12">
          <h3 className="rd-italic text-[28px]">Recently added</h3>
          <ul className="mt-3 grid gap-x-12 border-t border-night md:grid-cols-2">
            {recent.map(r => <ResourceRow key={r.id} resource={r} category={CATEGORY_LABELS[r.category]} />)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Section view ──────────────────────────────────────────────────────────────

function SectionView({ view, resources, targetSub, onBack }: {
  view: Exclude<View, 'welcome'>
  resources: Resource[]
  targetSub: string | null
  onBack: () => void
}) {
  useEffect(() => {
    if (!targetSub) return
    const t = setTimeout(() => document.getElementById(subId(targetSub))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
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

  const minOrder = (name: string) => Math.min(...sectionResources.filter(r => r.subcategory === name).map(r => r.subcategory_order ?? 0))
  const subcategoryNames = Array.from(new Set(sectionResources.map(r => r.subcategory).filter(Boolean) as string[])).sort((a, b) => minOrder(a) - minOrder(b))
  const ungrouped = sectionResources.filter(r => !r.subcategory)
  const grid = 'grid gap-x-12 border-t border-night md:grid-cols-2'

  return (
    <div className="py-6">
      <button type="button" onClick={onBack} className="rd-italic text-[22px] hover:underline underline-offset-[0.18em]">&larr; All resources</button>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="rd-display text-[clamp(36px,4vw,48px)] leading-[1.1]">{cat.label}</h3>
        <span className="rd-eyebrow text-[10px] text-earth-500">{count(sectionResources.length)}</span>
      </div>
      <p className="mt-2 text-[14px] text-earth-700">{cat.description}</p>

      {subcategoryNames.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          {subcategoryNames.map(name => (
            <button
              key={name}
              type="button"
              onClick={() => document.getElementById(subId(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="rd-italic text-[22px] text-club hover:underline underline-offset-[0.18em]"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {sectionResources.length === 0 ? (
        <p className="mt-8 text-[14px] text-earth-700">No resources yet.</p>
      ) : (
        <div className="mt-8 space-y-12">
          {ungrouped.length > 0 && <ul className={grid}>{ungrouped.map(r => <ResourceRow key={r.id} resource={r} />)}</ul>}
          {subcategoryNames.map(name => {
            const rows = sectionResources.filter(r => r.subcategory === name)
            return (
              <div key={name} id={subId(name)} className="scroll-mt-6">
                <div className="mb-3 flex items-baseline justify-between">
                  <h4 className="rd-italic text-[28px]">{name}</h4>
                  <span className="rd-eyebrow text-[10px] text-earth-500">{count(rows.length)}</span>
                </div>
                <ul className={grid}>{rows.map(r => <ResourceRow key={r.id} resource={r} />)}</ul>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DashboardClient({ resources }: { displayName?: string; resources: Resource[] }) {
  const [view, setView] = useState<View>('welcome')
  const [targetSub, setTargetSub] = useState<string | null>(null)

  function handleNavigate(cat: Exclude<View, 'welcome'>, sub?: string) {
    setTargetSub(sub ?? null)
    setView(cat)
  }

  return view === 'welcome'
    ? <WelcomeView resources={resources} onNavigate={handleNavigate} />
    : <SectionView view={view} resources={resources} targetSub={targetSub} onBack={() => { setView('welcome'); setTargetSub(null) }} />
}
