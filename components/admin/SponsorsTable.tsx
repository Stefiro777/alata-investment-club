'use client'

import { useState, useEffect } from 'react'

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

const LABEL = "text-[10px] font-medium uppercase tracking-widest text-ink-500 block mb-1"
const INPUT = "w-full border border-line px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white"
const BTN_PRIMARY = "bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-widest uppercase px-4 py-2 transition-colors"
const BTN_GHOST = "border border-line text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-widest uppercase px-4 py-2 transition-colors"
const BTN_DANGER = "border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors"

// ── Chevron icon ──────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

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
  const [err, setErr] = useState<string | null>(null)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto border border-line">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-[#f9f9f9]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-forest">
            {initial ? 'Edit' : 'Add'} Partner / Sponsor
          </h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Type toggle */}
          <div>
            <label className={LABEL}>Type</label>
            <div className="flex">
              {(['sponsor', 'partner'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`px-5 py-2 text-xs font-medium tracking-widest uppercase border transition-colors ${
                    form.type === t
                      ? t === 'sponsor'
                        ? 'bg-forest text-white border-forest'
                        : 'bg-[#6ca0dc] text-white border-[#6ca0dc]'
                      : 'border-line text-ink-500 hover:bg-[#f3f4f6]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LABEL}>Name *</label>
            <input className={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Acme S.p.A." />
          </div>
          <div>
            <label className={LABEL}>Logo URL</label>
            <input className={INPUT} value={form.logo_url} onChange={e => set('logo_url', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className={LABEL}>Website URL</label>
            <input className={INPUT} value={form.website_url} onChange={e => set('website_url', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea className={INPUT + ' resize-none'} rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {/* Accordo collapsible */}
          <div className="border border-line">
            <button
              type="button"
              onClick={() => setAccordoOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-[#f9f9f9] hover:bg-[#f3f4f6] transition-colors"
            >
              <span className="text-[10px] font-medium uppercase tracking-widest text-ink-500">Accordo</span>
              <Chevron open={accordoOpen} />
            </button>
            {accordoOpen && (
              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL}>Start date</label>
                    <input type="date" className={INPUT} value={form.agreement_start} onChange={e => set('agreement_start', e.target.value)} />
                  </div>
                  <div>
                    <label className={LABEL}>End date</label>
                    <input type="date" className={INPUT} value={form.agreement_end} onChange={e => set('agreement_end', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className={LABEL}>Value (€)</label>
                  <input type="number" min="0" step="0.01" className={INPUT} value={form.agreement_value} onChange={e => set('agreement_value', e.target.value)} placeholder="0.00" />
                </div>
                <div>
                  <label className={LABEL}>Description</label>
                  <textarea className={INPUT + ' resize-none'} rows={3} value={form.agreement_description} onChange={e => set('agreement_description', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={BTN_GHOST}>Cancel</button>
            <button type="submit" disabled={saving} className={BTN_PRIMARY + ' disabled:opacity-50'}>
              {saving ? '…' : initial ? 'Save' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Person inline row (view mode) ─────────────────────────────────────────────
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
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-2.5 border-b border-line-faint last:border-0 text-xs">
      <span className="font-medium text-ink-900">{person.name}</span>
      <span className="text-ink-500">{person.role ?? '—'}</span>
      <span className="text-ink-500 truncate">{person.email ?? '—'}</span>
      <span className="text-ink-500">{person.phone ?? '—'}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onEdit(person)}
          className="border border-forest text-forest hover:bg-forest hover:text-white text-[10px] font-medium uppercase tracking-widest px-2 py-1 transition-colors"
        >
          Edit
        </button>
        {delConfirm ? (
          <>
            <span className="text-[10px] text-red-600">Sure?</span>
            <button onClick={() => onDelete(person.id)} className={BTN_DANGER}>Yes</button>
            <button onClick={() => setDelConfirm(false)} className="border border-line text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors">No</button>
          </>
        ) : (
          <button onClick={() => setDelConfirm(true)} className={BTN_DANGER}>Delete</button>
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
    <div className="px-4 py-3 bg-[#f9f9f9] border-b border-line-faint">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={LABEL}>Name *</label>
          <input className={INPUT} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mario Rossi" />
        </div>
        <div>
          <label className={LABEL}>Role</label>
          <input className={INPUT} value={form.role} onChange={e => set('role', e.target.value)} placeholder="CEO" />
        </div>
        <div>
          <label className={LABEL}>Email</label>
          <input className={INPUT} value={form.email} onChange={e => set('email', e.target.value)} placeholder="mario@example.com" />
        </div>
        <div>
          <label className={LABEL}>Phone</label>
          <input className={INPUT} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+39 …" />
        </div>
      </div>
      <div className="mb-3">
        <label className={LABEL}>Notes</label>
        <textarea className={INPUT + ' resize-none'} rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      {err && <p className="text-xs text-red-500 mb-2">{err}</p>}
      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className={BTN_PRIMARY + ' disabled:opacity-50'}>
          {saving ? '…' : initial ? 'Save' : 'Add Contact'}
        </button>
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
      </div>
    </div>
  )
}

// ── People expandable panel ───────────────────────────────────────────────────
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
    <div className="border-t border-line-faint bg-paper-cool">
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2 bg-[#f3f4f6] border-b border-line-faint">
        {['Name', 'Role', 'Email', 'Phone', ''].map((h, i) => (
          <span key={i} className="text-[10px] font-medium uppercase tracking-widest text-ink-400">{h}</span>
        ))}
      </div>

      {partner.people.length === 0 && !addingNew && (
        <p className="px-4 py-3 text-xs text-ink-400">No contacts yet.</p>
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
        <div className="px-4 py-2.5">
          <button
            onClick={() => setAddingNew(true)}
            className="text-[10px] font-medium uppercase tracking-widest text-forest hover:underline"
          >
            + Add Contact
          </button>
        </div>
      )}
    </div>
  )
}

// ── Partner row ───────────────────────────────────────────────────────────────
function PartnerTableRow({
  partner,
  onEdit,
  onDelete,
  onChange,
}: {
  partner: PartnerRow
  onEdit: (p: PartnerRow) => void
  onDelete: (id: string) => void
  onChange: (updated: PartnerRow) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [delConfirm, setDelConfirm] = useState(false)

  const isSponsor = partner.type === 'sponsor'
  const badgeClass = isSponsor
    ? 'bg-forest text-white text-[9px] font-medium uppercase tracking-widest px-2 py-0.5'
    : 'bg-[#6ca0dc] text-white text-[9px] font-medium uppercase tracking-widest px-2 py-0.5'

  return (
    <>
      <tr className="border-b border-black/5 last:border-0 hover:bg-paper-cool transition-colors">
        <td className="px-3 py-3">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-ink-400 hover:text-ink-900 transition-colors"
            title={expanded ? 'Collapse' : 'Expand contacts'}
          >
            <Chevron open={expanded} />
          </button>
        </td>

        <td className="px-3 py-3">
          <span className={badgeClass}>{partner.type}</span>
        </td>

        <td className="px-3 py-3">
          <div className="flex items-center gap-2 min-w-0">
            {partner.logo_url && (
              <img
                src={partner.logo_url}
                alt={partner.name}
                className="w-7 h-7 object-contain flex-shrink-0 border border-line-faint bg-white p-0.5"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900 truncate">{partner.name}</p>
              {partner.description && (
                <p className="text-xs text-ink-400 truncate max-w-[180px]">{partner.description}</p>
              )}
            </div>
          </div>
        </td>

        <td className="px-3 py-3">
          {partner.website_url ? (
            <a href={partner.website_url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-forest hover:underline truncate block max-w-[140px]">
              {partner.website_url.replace(/^https?:\/\//, '')}
            </a>
          ) : (
            <span className="text-xs text-ink-300">—</span>
          )}
        </td>

        <td className="px-3 py-3 text-xs text-ink-500 whitespace-nowrap">
          {partner.agreement_start || partner.agreement_end ? (
            <span>{partner.agreement_start ?? '?'} → {partner.agreement_end ?? '?'}</span>
          ) : (
            <span className="text-ink-300">—</span>
          )}
        </td>

        <td className="px-3 py-3 text-xs text-ink-900 whitespace-nowrap">
          {partner.agreement_value != null
            ? `€ ${partner.agreement_value.toLocaleString('it-IT')}`
            : <span className="text-ink-300">—</span>
          }
        </td>

        <td className="px-3 py-3 text-xs text-ink-500 text-center">
          {partner.people.length}
        </td>

        <td className="px-3 py-3 text-xs text-ink-400 whitespace-nowrap">
          {new Date(partner.created_at).toLocaleDateString('it-IT')}
        </td>

        <td className="px-3 py-3 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(partner)}
              className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-2 py-1 transition-colors"
            >
              Edit
            </button>
            {delConfirm ? (
              <>
                <span className="text-[10px] text-red-600">Sure?</span>
                <button onClick={() => onDelete(partner.id)} className={BTN_DANGER}>Yes</button>
                <button onClick={() => setDelConfirm(false)} className="border border-line text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors">No</button>
              </>
            ) : (
              <button onClick={() => setDelConfirm(true)} className={BTN_DANGER}>Delete</button>
            )}
          </div>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={9} className="p-0">
            <PeoplePanel partner={partner} onChange={onChange} />
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main SponsorsTable ────────────────────────────────────────────────────────
export default function SponsorsTable() {
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'sponsor' | 'partner'>('all')
  const [modal, setModal] = useState<'add' | PartnerRow | null>(null)

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
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/crm/sponsors?id=${id}`, { method: 'DELETE' })
    setPartners(prev => prev.filter(p => p.id !== id))
  }

  function handleChange(updated: PartnerRow) {
    setPartners(prev => prev.map(p => p.id === updated.id ? updated : p))
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

  const FILTER_TABS: { key: typeof typeFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'sponsor', label: 'Sponsors' },
    { key: 'partner', label: 'Partners' },
  ]

  return (
    <div>
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: totalCount },
          { label: 'Sponsors', value: sponsorCount },
          { label: 'Partners', value: partnerCount },
          { label: 'Active', value: activeCount },
        ].map(kpi => (
          <div key={kpi.label} className="border border-line-faint bg-white px-4 py-3">
            <p className="text-[10px] font-medium uppercase tracking-widest text-ink-400 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-forest">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex border border-line">
          {FILTER_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTypeFilter(t.key)}
              className={`px-4 py-2 text-[10px] font-medium uppercase tracking-widest transition-colors ${
                typeFilter === t.key
                  ? 'bg-forest text-white'
                  : 'text-ink-500 hover:bg-[#f3f4f6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="border border-line px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white w-48"
          />
          <button onClick={() => setModal('add')} className={BTN_PRIMARY}>
            + Add
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink-400 py-8">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-ink-400 py-8">No entries found.</p>
      ) : (
        <div className="bg-white border border-line-faint overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-faint bg-[#f9f9f9]">
                <th className="px-3 py-3 w-8" />
                {['Type', 'Name', 'Website', 'Agreement', 'Value', 'Contacts', 'Added', 'Azioni'].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[10px] font-medium uppercase tracking-widest text-ink-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <PartnerTableRow
                  key={p.id}
                  partner={p}
                  onEdit={row => setModal(row)}
                  onDelete={handleDelete}
                  onChange={handleChange}
                />
              ))}
            </tbody>
          </table>
        </div>
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
