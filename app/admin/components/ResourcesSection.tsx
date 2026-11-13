'use client'

import { useEffect, useRef, useState } from 'react'
import { Pill, Row, Section, SegmentedPills, Tabs } from '@/app/components/member/ui'
import { fieldCls, labelCls, errorCls } from '@/components/admin/crm/ui'
import { createClient } from '@/lib/supabase'
import {
  AUDIENCE_GROUPS, audienceLabel, gettingStartedFor, gettingStartedLimit, limitWarnings,
} from '@/lib/getting-started'
import type { Resource } from '@/lib/types'

const RESOURCE_CATEGORIES = [
  { id: 'masters', label: 'Masters' },
  { id: 'career', label: 'Career & Recruiting' },
  { id: 'education', label: 'Education' },
  { id: 'documenti', label: 'Alata documents' },
]

const COLUMNS = 'id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at, audience'

const textAction = 'rd-italic text-[20px] hover:underline underline-offset-[0.18em] disabled:opacity-30'
const dangerAction = `${textAction} text-[#8a2a1d]`

// ── Upload ────────────────────────────────────────────────────────────────────

async function uploadResourceFile(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage.from('resources').upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('resources').getPublicUrl(data.path)
  return { url: publicUrl }
}

// ── One form for adding and editing ───────────────────────────────────────────

/**
 * The one flow for a resource: title, description, link or file, category, and the
 * years Getting started shows it to. Warns when a year would pass its limit.
 */
function ResourceForm({ initial, resources, category, subcategories, onSaved, onCancel }: {
  initial?: Resource
  /** Every resource, to count what each year would see. */
  resources: Resource[]
  category: string
  subcategories: string[]
  onSaved: (r: Resource) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [cat, setCat] = useState(initial?.category ?? category)
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '')
  const [isFolder, setIsFolder] = useState(initial?.is_folder ?? false)
  const [audience, setAudience] = useState<string[]>(initial?.audience ?? [])
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const result = await uploadResourceFile(file)
    if ('error' in result) setError(result.error)
    else setUrl(result.url)
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggleTag(tag: string) {
    setAudience(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
  }

  // What each year would see if this resource were saved with these tags.
  const projected = resources.map(r => (r.id === initial?.id ? { ...r, audience } : r))
  if (!initial) projected.push({ audience } as Resource)
  const warnings = limitWarnings(projected, audience)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      url: url.trim(),
      category: cat,
      subcategory: subcategory.trim() || null,
      is_folder: isFolder,
      description: description.trim() || null,
      audience: audience.length > 0 ? audience : null,
    }
    const supabase = createClient()
    const { data, error: err } = initial
      ? await supabase.from('resources').update(payload).eq('id', initial.id).select(COLUMNS).single()
      : await supabase.from('resources').insert(payload).select(COLUMNS).single()
    setSaving(false)
    if (err || !data) { setError(err?.message ?? 'Could not save.'); return }
    onSaved(data as Resource)
  }

  return (
    <form onSubmit={submit} className="border-y border-night/20 py-5">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Title</span>
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Guida ai master" className={fieldCls} />
        </label>
        <label className="block">
          <span className={labelCls}>Description (optional)</span>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="One line on what it is" className={fieldCls} />
        </label>

        <div className="sm:col-span-2">
          <span className={labelCls}>Link or file</span>
          <div className="flex items-end gap-4">
            <input required type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://drive.google.com/…" className={fieldCls} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${textAction} shrink-0 text-club`}>
              {uploading ? 'Uploading…' : 'Upload a file'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
        </div>

        <div>
          <div className={`${labelCls} mb-2`}>Category</div>
          <SegmentedPills size="sm" label="Category" options={RESOURCE_CATEGORIES.map(c => ({ value: c.id, label: c.label }))} value={cat} onChange={setCat} />
        </div>
        <div>
          <div className={`${labelCls} mb-2`}>Kind</div>
          <SegmentedPills
            size="sm"
            label="Kind"
            options={[{ value: 'doc', label: 'Document' }, { value: 'folder', label: 'Folder' }]}
            value={isFolder ? 'folder' : 'doc'}
            onChange={v => setIsFolder(v === 'folder')}
          />
        </div>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Subcategory (optional)</span>
          <input list="resource-subcategories" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Interview Prep" className={`${fieldCls} sm:w-1/2`} />
          <datalist id="resource-subcategories">{subcategories.map(s => <option key={s} value={s} />)}</datalist>
        </label>

        <div className="sm:col-span-2">
          <div className={`${labelCls} mb-2`}>Shown in Getting started to</div>
          <div role="group" aria-label="Shown in Getting started to" className="flex flex-wrap gap-1.5">
            {AUDIENCE_GROUPS.map(g => (
              <Pill key={g.tag} size="sm" active={audience.includes(g.tag)} onClick={() => toggleTag(g.tag)}>{g.label}</Pill>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-[1.5] text-earth-600">
            {audience.length === 0
              ? 'None selected: it is not suggested to anyone in Getting started. It stays in Career Resources.'
              : `Suggested to ${audience.map(audienceLabel).join(', ')}.`}
          </p>
          {warnings.map(w => (
            <p key={w.label} role="status" className="mt-2 text-[12px] leading-[1.5] text-[#8a2a1d]">
              {w.label} would have {w.count} resources, but Getting started shows {w.limit}: the last {w.count - w.limit === 1 ? 'one is' : `${w.count - w.limit} are`} left out.
            </p>
          ))}
        </div>
      </div>

      {error && <p role="alert" className={`${errorCls} mt-5`}>{error}</p>}
      <div className="mt-6 flex items-baseline gap-6">
        <button type="submit" disabled={saving || uploading} className="rd-italic text-[24px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50">
          {saving ? 'Saving…' : initial ? 'Save' : 'Add resource'}
        </button>
        <button type="button" onClick={onCancel} className={textAction}>Cancel</button>
      </div>
    </form>
  )
}

// ── A row of the list ─────────────────────────────────────────────────────────

function ResourceItem({ resource, resources, subcategories, canMove, isFirst, isLast, onMove, onUpdated, onDeleted }: {
  resource: Resource
  resources: Resource[]
  subcategories: string[]
  canMove: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (delta: -1 | 1) => void
  onUpdated: (r: Resource) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function remove() {
    setDeleting(true)
    setDeleteError(null)
    const { error } = await createClient().from('resources').delete().eq('id', resource.id)
    if (error) { setDeleteError(error.message); setDeleting(false); return }
    onDeleted(resource.id)
  }

  if (editing) {
    return (
      <div className="border-b border-night/20">
        <ResourceForm
          initial={resource}
          resources={resources}
          category={resource.category}
          subcategories={subcategories}
          onSaved={r => { onUpdated(r); setEditing(false) }}
          onCancel={() => setEditing(false)}
        />
      </div>
    )
  }

  const kind = [resource.is_folder ? 'Folder' : 'Document', resource.subcategory].filter(Boolean).join(' · ')
  return (
    <div className="border-b border-night/20 py-3.5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4">
        <div className="min-w-0">
          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-serif text-[22px] font-medium leading-[1.1] hover:underline underline-offset-[0.18em]">
            {resource.title}
          </a>
          {resource.description && <div className="mt-[3px] text-[12px] leading-[1.5] text-earth-600">{resource.description}</div>}
          <div className="rd-eyebrow mt-1.5 text-[10px] text-earth-500">{kind}</div>
          {(resource.audience ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Shown in Getting started to">
              {(resource.audience ?? []).map(tag => <Pill key={tag} size="sm" solid>{audienceLabel(tag)}</Pill>)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1">
          {canMove && (
            <>
              <button type="button" onClick={() => onMove(-1)} disabled={isFirst} aria-label={`Move ${resource.title} up`} className={textAction}>Up</button>
              <button type="button" onClick={() => onMove(1)} disabled={isLast} aria-label={`Move ${resource.title} down`} className={textAction}>Down</button>
            </>
          )}
          <button type="button" onClick={() => setEditing(true)} className={textAction}>Edit</button>
          {confirmDelete ? (
            <span className="flex items-baseline gap-4">
              <span className="text-[12px]">Delete?</span>
              <button type="button" onClick={remove} disabled={deleting} className={dangerAction}>Yes</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={textAction}>No</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className={dangerAction}>Delete</button>
          )}
        </div>
      </div>
      {deleteError && <p role="alert" className={`${errorCls} mt-2`}>{deleteError}</p>}
    </div>
  )
}

// ── Subcategory order ─────────────────────────────────────────────────────────

function SubcategoryOrder({ category, resources, onSaved }: {
  category: string
  resources: Resource[]
  onSaved: (subcategory: string, order: number) => void
}) {
  const names = Array.from(new Set(resources.map(r => r.subcategory).filter(Boolean) as string[]))
  const [orders, setOrders] = useState<Record<string, number>>(() =>
    Object.fromEntries(names.map(n => [n, resources.find(r => r.subcategory === n)?.subcategory_order ?? 0])),
  )
  const [state, setState] = useState<Record<string, 'saving' | 'saved' | string>>({})

  if (names.length < 2) return null

  async function save(name: string) {
    setState(p => ({ ...p, [name]: 'saving' }))
    const { error } = await createClient()
      .from('resources')
      .update({ subcategory_order: orders[name] })
      .eq('category', category)
      .eq('subcategory', name)
    if (error) { setState(p => ({ ...p, [name]: error.message })); return }
    onSaved(name, orders[name])
    setState(p => ({ ...p, [name]: 'saved' }))
    setTimeout(() => setState(p => ({ ...p, [name]: '' })), 2000)
  }

  return (
    <Section title="Subcategory order" meta="Lower numbers come first">
      {names.map(name => (
        <div key={name} className="grid grid-cols-[minmax(0,1fr)_auto_64px] items-center gap-x-4 border-b border-night/20 py-3">
          <span className="font-serif text-[20px] font-medium leading-[1.15]">{name}</span>
          <input
            type="number"
            value={orders[name] ?? 0}
            onChange={e => setOrders(p => ({ ...p, [name]: parseInt(e.target.value) || 0 }))}
            onBlur={() => save(name)}
            aria-label={`Order of ${name}`}
            className="w-20 border-0 border-b border-night/40 bg-transparent py-1 text-center text-[13px] outline-none focus:border-night"
          />
          <span className="text-[11px] text-earth-600">
            {state[name] === 'saving' ? '…' : state[name] === 'saved' ? 'Saved' : state[name] ? <span className="text-[#8a2a1d]">{state[name]}</span> : ''}
          </span>
        </div>
      ))}
    </Section>
  )
}

// ── Preview: Getting started as a member of a given year sees it ──────────────

const PREVIEW_YEARS = [
  ...AUDIENCE_GROUPS.filter(g => g.year !== null).map(g => ({ value: g.tag, label: g.label, level: g.level as string | null, year: g.year as number | null })),
  { value: 'none', label: 'No study data', level: null, year: null },
]

function MemberPreview({ resources }: { resources: Resource[] }) {
  const [pick, setPick] = useState('bachelor_1')
  const chosen = PREVIEW_YEARS.find(y => y.value === pick) ?? PREVIEW_YEARS[0]
  const shown = gettingStartedFor(resources.filter(r => r.url), chosen.level, chosen.year)
  const limit = gettingStartedLimit(chosen.level, chosen.year)

  return (
    <Section title="As members see it" meta={`Getting started · ${shown.length} of ${limit}`}>
      <div className="pb-3 pt-4">
        <SegmentedPills size="sm" label="Year of study" options={PREVIEW_YEARS.map(y => ({ value: y.value, label: y.label }))} value={pick} onChange={setPick} />
      </div>
      {shown.length === 0 ? (
        <p className="border-y border-night/20 py-4 text-[13px] text-earth-600">
          Nothing is tagged for this year: members see one guide per area instead.
        </p>
      ) : (
        <div className="border-t border-night/20">
          {shown.map(r => <Row key={r.id} title={r.title} detail={r.description} action="Open" />)}
        </div>
      )}
    </Section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResourcesSection({ initialResources }: { initialResources: Resource[] }) {
  const [list, setList] = useState<Resource[]>(initialResources)
  const [cat, setCat] = useState('masters')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [orderError, setOrderError] = useState<string | null>(null)

  const inCat = list.filter(r => r.category === cat)
  const q = search.trim().toLowerCase()
  const shown = q ? inCat.filter(r => r.title.toLowerCase().includes(q)) : inCat
  const subcategories = Array.from(new Set(inCat.map(r => r.subcategory).filter(Boolean) as string[]))
  const catLabel = RESOURCE_CATEGORIES.find(c => c.id === cat)?.label ?? cat

  const dragFrom = useRef<number | null>(null)
  const catRef = useRef(inCat)
  useEffect(() => { catRef.current = inCat })

  function upsert(r: Resource) {
    setList(prev => (prev.some(x => x.id === r.id) ? prev.map(x => (x.id === r.id ? r : x)) : [...prev, r]))
  }

  /** Saves the order of the category: the position in the list becomes order_index. */
  async function reorder(next: Resource[]) {
    setList(prev => [...prev.filter(r => r.category !== cat), ...next.map((r, i) => ({ ...r, order_index: i }))])
    setOrderError(null)
    const supabase = createClient()
    const results = await Promise.all(next.map((r, i) => supabase.from('resources').update({ order_index: i }).eq('id', r.id)))
    const failed = results.find(r => r.error)
    if (failed?.error) setOrderError(failed.error.message)
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...catRef.current]
    const j = index + delta
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    reorder(next)
  }

  function drop(index: number) {
    const from = dragFrom.current
    dragFrom.current = null
    if (from === null || from === index) return
    const next = [...catRef.current]
    const [moved] = next.splice(from, 1)
    next.splice(index, 0, moved)
    reorder(next)
  }

  return (
    <div>
      <Tabs
        tabs={RESOURCE_CATEGORIES.map(c => ({ key: c.id, label: `${c.label} (${list.filter(r => r.category === c.id).length})` }))}
        value={cat}
        onChange={id => { setCat(id); setAdding(false); setSearch('') }}
      />

      <Section title={catLabel} meta={`${inCat.length} resources`}>
        <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3 pt-3">
          <Pill solid onClick={() => setAdding(a => !a)}>{adding ? 'Close form' : 'Add resource'}</Pill>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title…"
            aria-label="Search resources"
            className="w-full min-w-[200px] flex-1 border-0 border-b border-night/40 bg-transparent py-2 text-[13px] outline-none placeholder:text-earth-500 focus:border-night sm:max-w-[320px]"
          />
        </div>

        {adding && (
          <div className="mb-4">
            <ResourceForm
              resources={list}
              category={cat}
              subcategories={subcategories}
              onSaved={r => { upsert(r); setAdding(false); if (r.category !== cat) setCat(r.category) }}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {orderError && <p role="alert" className={`${errorCls} mb-3`}>{orderError}</p>}

        {inCat.length === 0 ? (
          <p className="border-y border-night/20 py-4 text-[13px] text-earth-600">No resources in this category yet.</p>
        ) : shown.length === 0 ? (
          <p className="border-y border-night/20 py-4 text-[13px] text-earth-600">No result for &ldquo;{search}&rdquo;.</p>
        ) : (
          <div className="border-t border-night/20">
            {shown.map((r, i) => (
              <div
                key={r.id}
                draggable={!q}
                onDragStart={!q ? () => { dragFrom.current = i } : undefined}
                onDragOver={!q ? e => e.preventDefault() : undefined}
                onDrop={!q ? () => drop(i) : undefined}
              >
                <ResourceItem
                  resource={r}
                  resources={list}
                  subcategories={subcategories}
                  canMove={!q}
                  isFirst={i === 0}
                  isLast={i === shown.length - 1}
                  onMove={delta => move(i, delta)}
                  onUpdated={upsert}
                  onDeleted={id => setList(prev => prev.filter(x => x.id !== id))}
                />
              </div>
            ))}
          </div>
        )}
      </Section>

      <SubcategoryOrder
        key={cat}
        category={cat}
        resources={inCat}
        onSaved={(name, order) => setList(prev => prev.map(r => (r.category === cat && r.subcategory === name ? { ...r, subcategory_order: order } : r)))}
      />

      <MemberPreview resources={list} />
    </div>
  )
}
