'use client'

import { useState, useEffect, useRef } from 'react'
import { FieldRow, SegmentedPills } from '@/app/components/member/ui'
import {
  Numbers, Toolbar, SearchField, Split, CrmTable, CrmRow, NameCell, Sheet, SheetEmpty, BlockField, Heading, Dialog,
  cell, fmtDate, revealSheet, fieldCls, labelCls, btnPrimary, btnGhost, btnDanger, errorCls, type Column,
} from './crm/ui'

type SponsorPerson = {
  id: string
  partner_id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

type PartnerRow = {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  description: string | null
  type: 'sponsor' | 'partner'
  order_index: number | null
  click_count: number
  created_at: string
  agreement_start: string | null
  agreement_end: string | null
  agreement_value: number | null
  agreement_description: string | null
  people: SponsorPerson[]
}

const COLUMNS: Column[] = [
  { label: 'Company' },
  { label: 'Type' },
  { label: 'Ends', wide: true },
  { label: 'Value', wide: true, align: 'right' },
  { label: 'People', wide: true, align: 'right' },
]
const TEMPLATE = 'grid-cols-[minmax(0,1fr)_64px] sm:grid-cols-[minmax(0,1fr)_64px_88px_80px_60px]'

const TYPE_OPTIONS = [
  { value: 'sponsor', label: 'Sponsor' },
  { value: 'partner', label: 'Partner' },
] as const

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'sponsor', label: 'Sponsors' },
  { value: 'partner', label: 'Partners' },
] as const

const typeLabel = (t: string) => (t === 'sponsor' ? 'Sponsor' : 'Partner')
const eur = (n: number) => `€ ${n.toLocaleString('it-IT')}`
const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

// ── Add/Edit partner modal ────────────────────────────────────────────────────
function PartnerModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PartnerRow
  onClose: () => void
  onSaved: (p: PartnerRow) => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    logo_url: initial?.logo_url ?? '',
    website_url: initial?.website_url ?? '',
    description: initial?.description ?? '',
    type: (initial?.type ?? 'sponsor') as 'sponsor' | 'partner',
    agreement_start: initial?.agreement_start ?? '',
    agreement_end: initial?.agreement_end ?? '',
    agreement_value: initial?.agreement_value?.toString() ?? '',
    agreement_description: initial?.agreement_description ?? '',
  })
  const [accordoOpen, setAccordoOpen] = useState(
    !!(initial?.agreement_start || initial?.agreement_end || initial?.agreement_value || initial?.agreement_description)
  )
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr(null)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/upload-partner-logo', { method: 'POST', body: formData })
    const json = await res.json()
    setUploading(false)
    if (!res.ok) { setErr(json.error ?? 'Upload failed'); return }
    set('logo_url', json.url)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setErr('Name is required'); return }
    setSaving(true); setErr(null)
    const payload = {
      ...(initial ? { id: initial.id } : {}),
      name: form.name.trim(),
      logo_url: form.logo_url.trim() || null,
      website_url: form.website_url.trim() || null,
      description: form.description.trim() || null,
      type: form.type,
      agreement_start: form.agreement_start || null,
      agreement_end: form.agreement_end || null,
      agreement_value: form.agreement_value ? parseFloat(form.agreement_value) : null,
      agreement_description: form.agreement_description.trim() || null,
    }
    const method = initial ? 'PATCH' : 'POST'
    const res = await fetch('/api/admin/crm/sponsors', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setErr(json.error ?? 'Error'); return }
    onSaved({ ...json.partner, people: initial?.people ?? [] })
  }

  return (
    <Dialog title={initial ? 'Edit company' : 'Add company'} sub="Partner or sponsor" onClose={onClose} busy={saving}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <span className={`${labelCls} mb-2`}>Type</span>
          <SegmentedPills size="sm" label="Type" options={[...TYPE_OPTIONS]} value={form.type} onChange={t => set('type', t)} />
        </div>

        <label className="block"><span className={labelCls}>Name *</span>
          <input className={fieldCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme S.p.A." /></label>
        <div>
          <label className="block"><span className={labelCls}>Logo URL</span>
            <input className={fieldCls} value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://…" /></label>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={btnGhost}>
              {uploading ? 'Uploading…' : 'oppure carica un file'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            {form.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="Logo preview" className="h-8 w-8 shrink-0 object-contain" />
            )}
          </div>
        </div>
        <label className="block"><span className={labelCls}>Website URL</span>
          <input className={fieldCls} value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://…" /></label>
        <label className="block"><span className={labelCls}>Description</span>
          <textarea className={`${fieldCls} resize-none`} rows={2} value={form.description} onChange={e => set('description', e.target.value)} /></label>

        {/* Agreement, collapsible */}
        <div className="border-t border-night/20">
          <button
            type="button"
            onClick={() => setAccordoOpen(v => !v)}
            aria-expanded={accordoOpen}
            className="flex w-full items-baseline justify-between py-3 text-left"
          >
            <span className="rd-italic text-[22px]">Accordo</span>
            <span className="rd-eyebrow text-[10px] text-earth-500">{accordoOpen ? 'Hide' : 'Show'}</span>
          </button>
          {accordoOpen && (
            <div className="space-y-5 pb-2">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <label className="block"><span className={labelCls}>Start date</span>
                  <input type="date" className={fieldCls} value={form.agreement_start} onChange={e => set('agreement_start', e.target.value)} /></label>
                <label className="block"><span className={labelCls}>End date</span>
                  <input type="date" className={fieldCls} value={form.agreement_end} onChange={e => set('agreement_end', e.target.value)} /></label>
              </div>
              <label className="block"><span className={labelCls}>Value (€)</span>
                <input type="number" min="0" step="0.01" className={fieldCls} value={form.agreement_value} onChange={e => set('agreement_value', e.target.value)} placeholder="0.00" /></label>
              <label className="block"><span className={labelCls}>Description</span>
                <textarea className={`${fieldCls} resize-none`} rows={3} value={form.agreement_description} onChange={e => set('agreement_description', e.target.value)} /></label>
            </div>
          )}
        </div>

        {err && <p className={errorCls}>{err}</p>}

        <div className="flex justify-end gap-2 border-t border-night/20 pt-4">
          <button type="button" onClick={onClose} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? '…' : initial ? 'Save' : 'Add'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}

// ── Person line (view mode) ───────────────────────────────────────────────────
function PersonRow({
  person,
  onEdit,
  onDelete,
}: {
  person: SponsorPerson
  onEdit: (p: SponsorPerson) => void
  onDelete: (id: string) => void
}) {
  const [delConfirm, setDelConfirm] = useState(false)
  const detail = [person.role, person.email, person.phone].filter(Boolean).join(' · ')
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3">
      <div className="min-w-0">
        <div className="truncate font-serif text-[19px] font-medium leading-[1.15]">{person.name}</div>
        <div className="mt-0.5 truncate text-[12px] text-earth-600">{detail || '—'}</div>
        {person.notes && <div className="mt-1 whitespace-pre-wrap text-[12px] leading-[1.5] text-earth-700">{person.notes}</div>}
      </div>
      <div className="flex items-center gap-3">
        {delConfirm ? (
          <>
            <span className="text-[12px]">Delete?</span>
            <button type="button" onClick={() => onDelete(person.id)} className="rd-italic text-[18px] text-[#8a2a1d]">Yes</button>
            <button type="button" onClick={() => setDelConfirm(false)} className="rd-italic text-[18px]">No</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onEdit(person)} className="rd-italic text-[18px]">Edit</button>
            <button type="button" onClick={() => setDelConfirm(true)} className="rd-italic text-[18px] text-earth-600">Delete</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Person inline form ────────────────────────────────────────────────────────
function PersonForm({
  partnerId,
  initial,
  onSaved,
  onCancel,
}: {
  partnerId: string
  initial?: SponsorPerson
  onSaved: (p: SponsorPerson) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    role: initial?.role ?? '',
    email: initial?.email ?? '',
    phone: initial?.phone ?? '',
    notes: initial?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSave() {
    if (!form.name.trim()) { setErr('Name required'); return }
    setSaving(true); setErr(null)
    const payload = {
      ...(initial ? { id: initial.id } : { partner_id: partnerId }),
      name: form.name.trim(),
      role: form.role.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
    }
    const method = initial ? 'PATCH' : 'POST'
    const res = await fetch('/api/admin/crm/sponsors/people', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setErr(json.error ?? 'Error'); return }
    onSaved(json.person)
  }

  return (
    <div className="space-y-4 border-b border-night/20 py-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block"><span className={labelCls}>Name *</span>
          <input className={fieldCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mario Rossi" /></label>
        <label className="block"><span className={labelCls}>Role</span>
          <input className={fieldCls} value={form.role} onChange={e => set('role', e.target.value)} placeholder="CEO" /></label>
        <label className="block"><span className={labelCls}>Email</span>
          <input className={fieldCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario@example.com" /></label>
        <label className="block"><span className={labelCls}>Phone</span>
          <input className={fieldCls} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 …" /></label>
      </div>
      <label className="block"><span className={labelCls}>Notes</span>
        <textarea className={`${fieldCls} resize-none`} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></label>
      {err && <p className={errorCls}>{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? '…' : initial ? 'Save' : 'Add contact'}
        </button>
        <button type="button" onClick={onCancel} className={btnGhost}>Cancel</button>
      </div>
    </div>
  )
}

// ── People of a company, in its sheet ─────────────────────────────────────────
function PeoplePanel({ partner, onChange }: { partner: PartnerRow; onChange: (updated: PartnerRow) => void }) {
  const [addingNew, setAddingNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleSaved(person: SponsorPerson) {
    const existing = partner.people.find(p => p.id === person.id)
    const updated = existing
      ? partner.people.map(p => p.id === person.id ? person : p)
      : [...partner.people, person]
    onChange({ ...partner, people: updated })
    setAddingNew(false)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/crm/sponsors/people?id=${id}`, { method: 'DELETE' })
    onChange({ ...partner, people: partner.people.filter(p => p.id !== id) })
  }

  return (
    <section className="mt-10">
      <Heading title="People" meta={partner.people.length} />
      <div className="border-t border-night">
        {partner.people.length === 0 && !addingNew && (
          <p className="border-b border-night/20 py-4 text-[13px] text-earth-600">No contacts yet.</p>
        )}

        {partner.people.map(person =>
          editingId === person.id ? (
            <PersonForm
              key={person.id}
              partnerId={partner.id}
              initial={person}
              onSaved={handleSaved}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <PersonRow
              key={person.id}
              person={person}
              onEdit={p => setEditingId(p.id)}
              onDelete={handleDelete}
            />
          )
        )}

        {addingNew ? (
          <PersonForm
            partnerId={partner.id}
            onSaved={handleSaved}
            onCancel={() => setAddingNew(false)}
          />
        ) : (
          <button type="button" onClick={() => setAddingNew(true)} className={`${btnGhost} mt-4`}>Add contact</button>
        )}
      </div>
    </section>
  )
}

// ── Main SponsorsTable ────────────────────────────────────────────────────────
export default function SponsorsTable() {
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sponsor' | 'partner'>('all')
  const [modal, setModal] = useState<'add' | PartnerRow | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [delConfirm, setDelConfirm] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/crm/sponsors')
      .then(r => r.json())
      .then(json => { setPartners(json.partners ?? []); setLoading(false) })
  }, [])

  function handleSaved(p: PartnerRow) {
    setPartners(prev => {
      const idx = prev.findIndex(x => x.id === p.id)
      return idx >= 0 ? prev.map((x, i) => i === idx ? p : x) : [p, ...prev]
    })
    setModal(null)
    setOpenId(p.id)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/crm/sponsors?id=${id}`, { method: 'DELETE' })
    setPartners(prev => prev.filter(p => p.id !== id))
    setOpenId(null)
    setDelConfirm(false)
  }

  function handleChange(updated: PartnerRow) {
    setPartners(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function open(id: string) {
    setOpenId(id)
    setDelConfirm(false)
    revealSheet(sheetRef.current)
  }

  const filtered = partners.filter(p => {
    const matchType = typeFilter === 'all' || p.type === typeFilter
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const totalCount = partners.length
  const sponsorCount = partners.filter(p => p.type === 'sponsor').length
  const partnerCount = partners.filter(p => p.type === 'partner').length
  const activeCount = partners.filter(p => {
    if (!p.agreement_end) return false
    return new Date(p.agreement_end) >= new Date()
  }).length

  const current = partners.find(p => p.id === openId) ?? null

  return (
    <div>
      <Numbers items={[
        { value: totalCount, label: 'Total' },
        { value: sponsorCount, label: 'Sponsors' },
        { value: partnerCount, label: 'Partners' },
        { value: activeCount, label: 'Active agreements' },
      ]} />

      <Toolbar actions={<button type="button" onClick={() => setModal('add')} className={btnPrimary}>Add company</button>}>
        <SearchField value={search} onChange={setSearch} placeholder="Company name…" />
        <div>
          <span className={`${labelCls} mb-2`}>Type</span>
          <SegmentedPills size="sm" label="Type filter" options={[...FILTERS]} value={typeFilter} onChange={setTypeFilter} />
        </div>
      </Toolbar>

      {loading ? (
        <p className="py-10 text-[13px] text-earth-600">Loading…</p>
      ) : (
        <Split
          sheetRef={sheetRef}
          list={
            <CrmTable
              title="Sponsors and partners"
              meta={filtered.length === totalCount ? totalCount : `${filtered.length} of ${totalCount}`}
              columns={COLUMNS}
              template={TEMPLATE}
              isEmpty={filtered.length === 0}
              empty="No entries found."
            >
              {filtered.map(p => (
                <CrmRow key={p.id} template={TEMPLATE} selected={p.id === openId} onOpen={() => open(p.id)} label={`Open ${p.name}`}>
                  <span className={cell(COLUMNS[0])}>
                    <NameCell name={p.name} sub={p.website_url ? host(p.website_url) : p.description ?? '—'} />
                  </span>
                  <span className={cell(COLUMNS[1], 'text-[12px] text-earth-700')}>{typeLabel(p.type)}</span>
                  <span className={cell(COLUMNS[2], 'rd-num text-[12px] text-earth-700')}>{p.agreement_end ? fmtDate(p.agreement_end) : '—'}</span>
                  <span className={cell(COLUMNS[3], 'rd-num text-[12px] text-earth-700')}>{p.agreement_value != null ? eur(p.agreement_value) : '—'}</span>
                  <span className={cell(COLUMNS[4], 'rd-num text-[12px] text-earth-700')}>{p.people.length}</span>
                </CrmRow>
              ))}
            </CrmTable>
          }
          sheet={
            current ? (
              <>
                <Sheet
                  title="Company"
                  meta={typeLabel(current.type)}
                  actions={
                    delConfirm ? (
                      <>
                        <span className="text-[13px]">Delete {current.name}?</span>
                        <button type="button" onClick={() => handleDelete(current.id)} className={btnDanger}>Yes, delete</button>
                        <button type="button" onClick={() => setDelConfirm(false)} className={btnGhost}>No</button>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setModal(current)} className={btnPrimary}>Edit</button>
                        <button type="button" onClick={() => setDelConfirm(true)} className={btnGhost}>Delete</button>
                      </>
                    )
                  }
                >
                  <FieldRow
                    label="Company"
                    value={current.name}
                    // eslint-disable-next-line @next/next/no-img-element
                    aside={current.logo_url ? <img src={current.logo_url} alt="" className="h-6 w-auto max-w-[72px] object-contain" /> : undefined}
                  />
                  <FieldRow label="Type" value={typeLabel(current.type)} />
                  <FieldRow
                    label="Website"
                    value={current.website_url ? <a href={current.website_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{host(current.website_url)}</a> : '—'}
                    muted={!current.website_url}
                  />
                  <FieldRow label="Agreement" value={current.agreement_start || current.agreement_end ? `${fmtDate(current.agreement_start)} → ${fmtDate(current.agreement_end)}` : '—'} muted={!current.agreement_start && !current.agreement_end} />
                  <FieldRow label="Value" value={current.agreement_value != null ? eur(current.agreement_value) : '—'} muted={current.agreement_value == null} />
                  <FieldRow label="Clicks" value={current.click_count ?? 0} aside="From the website" />
                  <FieldRow label="Added" value={fmtDate(current.created_at)} />
                  {current.description && <BlockField label="Description">{current.description}</BlockField>}
                  {current.agreement_description && <BlockField label="Agreement terms">{current.agreement_description}</BlockField>}
                </Sheet>
                <PeoplePanel key={current.id} partner={current} onChange={handleChange} />
              </>
            ) : (
              <SheetEmpty title="Company" text="Open a sponsor or partner to see the agreement and the people to call." />
            )
          }
        />
      )}

      {modal && (
        <PartnerModal
          initial={modal === 'add' ? undefined : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
