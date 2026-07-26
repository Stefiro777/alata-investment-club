'use client'

import { useState, useEffect, useMemo } from 'react'

type Contact = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  anno_di_studio: string
  motivazione: string | null
  questions_for_panelists: string | null
  created_at: string
  upcoming_events: {
    title: string
    date: string
  } | null
}

type EditForm = {
  nome: string
  cognome: string
  email: string
  telefono: string
  anno_di_studio: string
  motivazione: string
  questions_for_panelists: string
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

type FieldKey =
  | 'nome' | 'cognome' | 'email' | 'telefono' | 'anno_di_studio'
  | 'evento' | 'data_evento' | 'campo' | 'registrato_il'

const FIELD_DEFS: { key: FieldKey; label: string }[] = [
  { key: 'nome', label: 'Nome' },
  { key: 'cognome', label: 'Cognome' },
  { key: 'email', label: 'Email' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'anno_di_studio', label: 'Anno di studio' },
  { key: 'evento', label: 'Evento' },
  { key: 'data_evento', label: 'Data evento' },
  { key: 'campo', label: 'Campo' },
  { key: 'registrato_il', label: 'Registrato il' },
]

const ALL_FIELD_KEYS: FieldKey[] = FIELD_DEFS.map(f => f.key)

async function downloadEventContactsPDF(contacts: Contact[], fields: FieldKey[], eventFilter: string) {
  const res = await fetch('/api/admin/crm/event-contacts-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacts, fields, eventFilter }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Failed to generate PDF')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'event-contacts.pdf'
  a.click()
  URL.revokeObjectURL(url)
}

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({
  contact,
  onSave,
  onClose,
}: {
  contact: Contact
  onSave: (updated: Contact) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<EditForm>({
    nome: contact.nome,
    cognome: contact.cognome,
    email: contact.email,
    telefono: contact.telefono ?? '',
    anno_di_studio: contact.anno_di_studio,
    motivazione: contact.motivazione ?? '',
    questions_for_panelists: contact.questions_for_panelists ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof EditForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/crm/contacts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: contact.id,
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim() || null,
        anno_di_studio: form.anno_di_studio.trim(),
        motivazione: form.motivazione.trim() || null,
        questions_for_panelists: form.questions_for_panelists.trim() || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to save')
      setSaving(false)
      return
    }
    onSave(json.data)
    setSaving(false)
  }

  const inputClass =
    'w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:border-forest text-sm text-[#1a1a1a] bg-white transition-colors'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="bg-white border border-line w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <p className="font-serif text-base font-bold text-forest">Edit Contact</p>
          <button onClick={onClose} disabled={saving} className="text-ink-500 hover:text-[#1a1a1a] text-xl leading-none transition-colors -m-4 p-4 disabled:opacity-40">✕</button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Nome *</label>
              <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Cognome *</label>
              <input required value={form.cognome} onChange={e => set('cognome', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Telefono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Anno di studio *</label>
              <input required value={form.anno_di_studio} onChange={e => set('anno_di_studio', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Motivazione</label>
            <textarea rows={3} value={form.motivazione} onChange={e => set('motivazione', e.target.value)} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-500 uppercase tracking-widest mb-1">Questions for Panelists</label>
            <textarea rows={3} value={form.questions_for_panelists} onChange={e => set('questions_for_panelists', e.target.value)} className={`${inputClass} resize-none`} />
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
            <button type="button" onClick={onClose} disabled={saving} className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type QrState = 'idle' | 'confirm' | 'sending' | 'done' | 'error'

export default function EventContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [qrState, setQrState] = useState<QrState>('idle')
  const [qrResult, setQrResult] = useState<{ sent: number; failed: number } | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(ALL_FIELD_KEYS)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  function loadContacts() {
    setLoading(true)
    fetch('/api/admin/crm/contacts')
      .then(r => r.json())
      .then(({ data, error: err }) => {
        if (err) setError(err)
        else setContacts(data ?? [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadContacts() }, [])

  const events = useMemo(() => {
    const set = new Set(contacts.map(c => c.upcoming_events?.title).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [contacts])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contacts.filter(c => {
      const matchSearch = !q ||
        c.nome?.toLowerCase().includes(q) ||
        c.cognome?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      const matchEvent = !eventFilter || c.upcoming_events?.title === eventFilter
      return matchSearch && matchEvent
    })
  }, [contacts, search, eventFilter])

  const uniqueEmails = useMemo(() => new Set(contacts.map(c => c.email)).size, [contacts])
  const eventsWithRegs = useMemo(() => new Set(contacts.map(c => c.upcoming_events?.title).filter(Boolean)).size, [contacts])

  function handleSaved(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? { ...updated, upcoming_events: c.upcoming_events } : c))
    setEditContact(null)
  }

  const filteredForEvent = useMemo(
    () => eventFilter ? contacts.filter(c => c.upcoming_events?.title === eventFilter) : [],
    [contacts, eventFilter]
  )

  async function handleSendQr() {
    setQrState('sending')
    setQrError(null)
    const ids = filteredForEvent.map(c => c.id)
    try {
      const res = await fetch('/api/admin/crm/send-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registration_ids: ids }),
      })
      const json = await res.json()
      if (!res.ok) {
        setQrError(json.error ?? 'Failed')
        setQrState('error')
      } else {
        setQrResult(json)
        setQrState('done')
      }
    } catch (err: unknown) {
      setQrError(err instanceof Error ? err.message : 'Network error')
      setQrState('error')
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const res = await fetch(`/api/admin/crm/contacts?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setContacts(prev => prev.filter(c => c.id !== id))
    }
    setDeleteConfirm(null)
    setDeleting(false)
  }

  function toggleField(key: FieldKey) {
    setSelectedFields(prev =>
      prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]
    )
  }

  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    setPdfError(null)
    try {
      await downloadEventContactsPDF(filtered, selectedFields, eventFilter)
      setPdfMenuOpen(false)
    } catch (err: unknown) {
      setPdfError(err instanceof Error ? err.message : 'Errore nella generazione del PDF')
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) return <p className="text-sm text-ink-500 py-10 text-center">Loading…</p>
  if (error) return <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Contacts', value: contacts.length },
          { label: 'Unique Emails', value: uniqueEmails },
          { label: 'Events with Registrations', value: eventsWithRegs },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-line px-6 py-4">
            <p className="text-xs text-ink-500 uppercase tracking-widest font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-forest mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-forest w-64 transition-colors"
        />
        <select
          value={eventFilter}
          onChange={e => setEventFilter(e.target.value)}
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-forest transition-colors"
        >
          <option value="">All Events</option>
          {events.map(ev => (
            <option key={ev} value={ev}>{ev}</option>
          ))}
        </select>

        {eventFilter && (
          <div className="flex items-baseline gap-2 border-l border-line pl-4">
            <span className="font-serif text-3xl font-bold text-forest leading-none">{filtered.length}</span>
            <span className="text-xs text-ink-500 uppercase tracking-widest font-medium">Participants</span>
          </div>
        )}

        <div className="relative">
          <button
            onClick={() => setPdfMenuOpen(o => !o)}
            className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors"
          >
            Download PDF
          </button>

          {pdfMenuOpen && (
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 40 }}
                onClick={() => setPdfMenuOpen(false)}
              />
              <div
                className="absolute left-0 top-full mt-1 w-64 bg-white border border-line shadow-lg p-4"
                style={{ zIndex: 50 }}
              >
                <p className="text-xs font-medium text-ink-500 uppercase tracking-widest mb-3">Campi da esportare</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {FIELD_DEFS.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-sm text-[#1a1a1a] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(f.key)}
                        onChange={() => toggleField(f.key)}
                        className="accent-forest"
                      />
                      {f.label}
                    </label>
                  ))}
                </div>

                {pdfError && <p className="text-red-600 text-xs mt-3 border-l-2 border-red-400 pl-2 py-1">{pdfError}</p>}

                <button
                  onClick={handleGeneratePdf}
                  disabled={selectedFields.length === 0 || generatingPdf}
                  className="mt-4 w-full bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-widest uppercase px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingPdf ? 'Generazione…' : 'Genera PDF'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Send QR button — only when an event is selected */}
        {eventFilter && filteredForEvent.length > 0 && (
          <div className="flex items-center gap-2">
            {qrState === 'idle' && (
              <button
                onClick={() => setQrState('confirm')}
                className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors"
              >
                Send QR Codes
              </button>
            )}
            {qrState === 'confirm' && (
              <div className="flex items-center gap-2 border border-forest px-4 py-2">
                <span className="text-xs text-forest">
                  Send QR to {filteredForEvent.length} registrant{filteredForEvent.length !== 1 ? 's' : ''} of &ldquo;{eventFilter}&rdquo;?
                </span>
                <button
                  onClick={handleSendQr}
                  className="bg-forest text-white text-xs font-medium px-3 py-1 hover:bg-forest-deep transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setQrState('idle')}
                  className="border border-[#d1d5db] text-ink-500 text-xs font-medium px-3 py-1 hover:bg-[#f3f4f6] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {qrState === 'sending' && (
              <span className="text-xs text-ink-500 tracking-widest uppercase">Sending…</span>
            )}
            {qrState === 'done' && qrResult && (
              <span className="text-xs text-forest font-medium tracking-wide">
                ✓ Sent: {qrResult.sent} — Failed: {qrResult.failed}
                <button onClick={() => { setQrState('idle'); setQrResult(null) }} className="ml-2 text-ink-500 hover:text-[#1a1a1a]">✕</button>
              </span>
            )}
            {qrState === 'error' && (
              <span className="text-xs text-red-600">
                {qrError}
                <button onClick={() => setQrState('idle')} className="ml-2 text-ink-500 hover:text-[#1a1a1a]">✕</button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-line overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-[#f9f9f9]">
              {['Name', 'Email', 'Phone', 'Event', 'Date', 'Field', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-medium text-ink-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-500">
                  No contacts found.
                </td>
              </tr>
            ) : filtered.map(c => {
              const field = c.motivazione ?? c.questions_for_panelists
              const isExpanded = expandedId === c.id
              const isDeleting = deleteConfirm === c.id
              return (
                <tr
                  key={c.id}
                  className="group border-b border-black/5 last:border-0 hover:bg-[#f9f9f9] transition-colors"
                >
                  <td
                    className="px-4 py-3 font-medium text-[#1a1a1a] whitespace-nowrap cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    {c.nome} {c.cognome}
                  </td>
                  <td className="px-4 py-3 text-ink-500">{c.email}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500 max-w-[180px]">
                    <span title={c.upcoming_events?.title}>
                      {truncate(c.upcoming_events?.title, 40)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">
                    {c.upcoming_events?.date ?? '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-ink-500 max-w-[240px] cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    {isExpanded ? (
                      <span className="whitespace-pre-wrap">{field ?? '—'}</span>
                    ) : (
                      <span>{truncate(field, 60)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {isDeleting ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting}
                          className="border border-red-400 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium px-2 py-1 transition-colors disabled:opacity-40"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="border border-[#d1d5db] text-ink-500 hover:bg-[#f3f4f6] text-xs font-medium px-2 py-1 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditContact(c)}
                          title="Edit"
                          className="p-1.5 text-ink-500 hover:text-forest hover:bg-[#f0f5f3] transition-colors"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          title="Delete"
                          className="p-1.5 text-ink-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editContact && (
        <EditModal
          contact={editContact}
          onSave={handleSaved}
          onClose={() => setEditContact(null)}
        />
      )}
    </div>
  )
}
