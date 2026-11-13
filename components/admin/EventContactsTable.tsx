'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { FieldRow, SectionHeading, SegmentedPills } from '@/app/components/member/ui'
import { EVENT_YEARS, studyYearKey } from '@/lib/event-years'
import { EditParticipantModal, deleteParticipant, type Contact } from './EditParticipantModal'
import {
  Numbers, Toolbar, SearchField, SelectField, Split, CrmRow, NameCell, Sheet, SheetEmpty, BlockField, Tag, Dialog,
  cell, fmtDate, revealSheet, fieldCls, labelCls, btnPrimary, btnGhost, btnDanger, errorCls, type Column,
} from './crm/ui'

type AddForm = {
  nome: string
  cognome: string
  email: string
  telefono: string
  anno_di_studio: string
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

// Fixed columns, the same in every event group, so rows line up from one event to the next.
const COLUMNS: Column[] = [
  { label: 'Name' },
  { label: 'Email', wide: true },
  { label: 'Year', wide: true },
  { label: 'Status', align: 'right' },
]
const TEMPLATE = 'grid-cols-[minmax(0,1fr)_92px] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_104px_92px]'

/** The year as the profile shows it ("Bachelor 2"); the text as written when it cannot be read. */
function yearLabel(text: string | null | undefined): string {
  const key = studyYearKey(text)
  return EVENT_YEARS.find(y => y.value === key)?.label ?? (text?.trim() || '—')
}

const MEMBER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'members', label: 'Members' },
  { value: 'external', label: 'External' },
] as const

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

// ── Add Participant Modal ────────────────────────────────────────────────────
function AddParticipantModal({
  eventId,
  eventTitle,
  onAdded,
  onClose,
}: {
  eventId: string
  eventTitle: string
  onAdded: (created: Contact) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<AddForm>({
    nome: '', cognome: '', email: '', telefono: '', anno_di_studio: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof AddForm, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch('/api/admin/crm/contacts/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_id: eventId,
        nome: form.nome.trim(),
        cognome: form.cognome.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim() || undefined,
        anno_di_studio: form.anno_di_studio.trim(),
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Failed to add participant')
      setSaving(false)
      return
    }
    onAdded(json.data)
    setSaving(false)
  }

  return (
    <Dialog title="Add participant" sub={eventTitle} onClose={onClose} busy={saving}>
      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block"><span className={labelCls}>Nome *</span>
            <input required value={form.nome} onChange={e => set('nome', e.target.value)} className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Cognome *</span>
            <input required value={form.cognome} onChange={e => set('cognome', e.target.value)} className={fieldCls} /></label>
        </div>
        <label className="block"><span className={labelCls}>Email *</span>
          <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className={fieldCls} /></label>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="block"><span className={labelCls}>Telefono</span>
            <input value={form.telefono} onChange={e => set('telefono', e.target.value)} className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Anno di studio *</span>
            <input required value={form.anno_di_studio} onChange={e => set('anno_di_studio', e.target.value)} className={fieldCls} /></label>
        </div>

        {error && <p className={errorCls}>{error}</p>}

        <div className="flex justify-end gap-2 border-t border-night/20 pt-4">
          <button type="button" onClick={onClose} disabled={saving} className={btnGhost}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>{saving ? '…' : 'Add'}</button>
        </div>
      </form>
    </Dialog>
  )
}

type QrState = 'idle' | 'confirm' | 'sending' | 'done' | 'error'

export default function EventContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [eventList, setEventList] = useState<{ id: string; title: string; date: string }[]>([])
  const [memberFilter, setMemberFilter] = useState<'all' | 'members' | 'external'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [qrState, setQrState] = useState<QrState>('idle')
  const [qrResult, setQrResult] = useState<{ sent: number; failed: number } | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [pdfMenuOpen, setPdfMenuOpen] = useState(false)
  const [yearFilter, setYearFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedFields, setSelectedFields] = useState<FieldKey[]>(ALL_FIELD_KEYS)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  function loadContacts(silent = false) {
    if (!silent) setLoading(true)
    fetch('/api/admin/crm/contacts')
      .then(r => r.json())
      .then(({ data, events: evs, error: err }) => {
        if (err) setError(err)
        else {
          setContacts(data ?? [])
          setEventList(evs ?? [])
        }
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => { loadContacts() }, [])

  // Every event (newest first), including those without registrations yet.
  // The date is part of the label so two events with the same title are
  // distinguishable.
  const events = useMemo(
    () => eventList.map(ev => ({ id: ev.id, title: ev.title, label: `${ev.title} — ${ev.date}` })),
    [eventList]
  )

  const selectedEvent = useMemo(
    () => events.find(ev => ev.id === eventFilter) ?? null,
    [events, eventFilter]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contacts.filter(c => {
      const matchSearch = !q ||
        c.nome?.toLowerCase().includes(q) ||
        c.cognome?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      const matchEvent = !eventFilter || c.event_id === eventFilter
      const key = studyYearKey(c.anno_di_studio)
      const matchYear = !yearFilter || (yearFilter === 'none' ? key === null : key === yearFilter)
      const matchMember =
        memberFilter === 'all' ||
        (memberFilter === 'members' ? !!c.is_member : !c.is_member)
      return matchSearch && matchEvent && matchMember && matchYear
    })
  }, [contacts, search, eventFilter, memberFilter, yearFilter])

  // One group per event, newest event first (the order of the event list).
  const groups = useMemo(() => {
    const byEvent = new Map<string, Contact[]>()
    for (const c of filtered) {
      const list = byEvent.get(c.event_id)
      if (list) list.push(c)
      else byEvent.set(c.event_id, [c])
    }
    return eventList
      .filter(ev => byEvent.has(ev.id))
      .map(ev => ({ ...ev, contacts: byEvent.get(ev.id)! }))
  }, [filtered, eventList])

  function toggleGroup(id: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const uniqueEmails = useMemo(() => new Set(contacts.map(c => c.email)).size, [contacts])
  const eventsWithRegs = useMemo(() => new Set(contacts.map(c => c.upcoming_events?.title).filter(Boolean)).size, [contacts])
  const memberCount = useMemo(() => contacts.filter(c => c.is_member).length, [contacts])

  function handleSaved(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? { ...updated, upcoming_events: c.upcoming_events } : c))
    setEditContact(null)
    loadContacts(true) // refresh is_member (the PATCH response does not carry it)
  }

  const filteredForEvent = useMemo(
    () => eventFilter ? contacts.filter(c => c.event_id === eventFilter) : [],
    [contacts, eventFilter]
  )

  function handleAdded(created: Contact) {
    setContacts(prev => [created, ...prev])
    setShowAddModal(false)
    loadContacts(true)
  }

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
    const { ok } = await deleteParticipant(id)
    if (ok) {
      setContacts(prev => prev.filter(c => c.id !== id))
      if (openId === id) setOpenId(null)
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

  function open(id: string) {
    setOpenId(id)
    setDeleteConfirm(null)
    revealSheet(sheetRef.current)
  }

  const current = contacts.find(c => c.id === openId) ?? null

  if (loading) return <p className="py-10 text-center text-[13px] text-earth-600">Loading…</p>
  if (error) return <p className={errorCls}>{error}</p>

  return (
    <div>
      <Numbers items={[
        { value: contacts.length, label: 'Total contacts' },
        { value: uniqueEmails, label: 'Unique emails' },
        { value: eventsWithRegs, label: 'Events with registrations' },
        { value: memberCount, label: 'Of them members' },
      ]} />

      <Toolbar
        actions={
          <div className="relative">
            <button type="button" onClick={() => { setPdfMenuOpen(false); setActionsOpen(o => !o) }} aria-expanded={actionsOpen || pdfMenuOpen} className={btnPrimary}>
              Actions
            </button>
            {(actionsOpen || pdfMenuOpen) && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setActionsOpen(false); setPdfMenuOpen(false) }} />
                <div className="absolute right-0 top-full z-50 mt-2 w-72 border border-night bg-ivory p-4 shadow-xl">
                  {actionsOpen && (
                    <div className="flex flex-col items-start gap-3">
                      <button
                        type="button"
                        disabled={!selectedEvent}
                        onClick={() => { setShowAddModal(true); setActionsOpen(false) }}
                        className="rd-italic text-[22px] hover:underline underline-offset-[0.18em] disabled:opacity-40"
                      >
                        Add participant
                      </button>
                      <button
                        type="button"
                        disabled={!eventFilter || filteredForEvent.length === 0 || qrState !== 'idle'}
                        onClick={() => { setQrState('confirm'); setActionsOpen(false) }}
                        className="rd-italic text-[22px] hover:underline underline-offset-[0.18em] disabled:opacity-40"
                      >
                        Send QR codes
                      </button>
                      <button
                        type="button"
                        onClick={() => { setActionsOpen(false); setPdfMenuOpen(true) }}
                        className="rd-italic text-[22px] hover:underline underline-offset-[0.18em]"
                      >
                        Download PDF
                      </button>
                      {!selectedEvent && <p className="text-[11px] leading-[1.5] text-earth-600">Choose an event to add participants or send the QR codes.</p>}
                    </div>
                  )}
                  {pdfMenuOpen && (
                    <>
                      <p className={`${labelCls} mb-3`}>Fields to export</p>
                      <div className="max-h-64 space-y-2 overflow-y-auto">
                        {FIELD_DEFS.map(f => (
                          <label key={f.key} className="flex cursor-pointer items-center gap-2 text-[13px]">
                            <input
                              type="checkbox"
                              checked={selectedFields.includes(f.key)}
                              onChange={() => toggleField(f.key)}
                              className="accent-[#1a4a3a]"
                            />
                            {f.label}
                          </label>
                        ))}
                      </div>
                      {pdfError && <p className={`${errorCls} mt-3`}>{pdfError}</p>}
                      <button
                        type="button"
                        onClick={handleGeneratePdf}
                        disabled={selectedFields.length === 0 || generatingPdf}
                        className={`${btnPrimary} mt-4 w-full`}
                      >
                        {generatingPdf ? 'Generating…' : 'Generate PDF'}
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        }
      >
        <SearchField value={search} onChange={setSearch} placeholder="Name or email…" />
        <SelectField label="Event" value={eventFilter} onChange={setEventFilter} width="sm:w-[260px]">
          <option value="">All events</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.label}</option>)}
        </SelectField>
        <SelectField label="Year" value={yearFilter} onChange={setYearFilter} width="sm:w-[150px]">
          <option value="">All years</option>
          {EVENT_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
          <option value="none">No year</option>
        </SelectField>
        <div>
          <span className={`${labelCls} mb-2`}>Status</span>
          <SegmentedPills size="sm" label="Members filter" options={[...MEMBER_FILTERS]} value={memberFilter} onChange={setMemberFilter} />
        </div>
      </Toolbar>

      {eventFilter && qrState !== 'idle' && (
        <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-night/20 py-3 text-[13px]">
          {qrState === 'confirm' && (
            <>
              <span>
                Send the QR code to {filteredForEvent.length} registrant{filteredForEvent.length !== 1 ? 's' : ''} of &ldquo;{selectedEvent?.title ?? ''}&rdquo;?
              </span>
              <button type="button" onClick={handleSendQr} className={btnPrimary}>Yes, send</button>
              <button type="button" onClick={() => setQrState('idle')} className={btnGhost}>Cancel</button>
            </>
          )}
          {qrState === 'sending' && <span className="text-earth-600">Sending…</span>}
          {qrState === 'done' && qrResult && (
            <>
              <span>Sent: {qrResult.sent} · Failed: {qrResult.failed}</span>
              <button type="button" onClick={() => { setQrState('idle'); setQrResult(null) }} className="rd-italic text-[18px]">Close</button>
            </>
          )}
          {qrState === 'error' && (
            <>
              <span className="text-[#8a2a1d]">{qrError}</span>
              <button type="button" onClick={() => setQrState('idle')} className="rd-italic text-[18px]">Close</button>
            </>
          )}
        </div>
      )}

      <Split
        sheetRef={sheetRef}
        list={
          <div>
            <div role="row" className={`grid ${TEMPLATE} items-end gap-x-4 border-b border-night/20 px-1 py-2.5`}>
              {COLUMNS.map((c, i) => (
                <span key={i} role="columnheader" className={`rd-eyebrow truncate text-[9px] text-earth-500 ${c.wide ? 'hidden sm:block' : ''} ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</span>
              ))}
            </div>
            {groups.length === 0 && <p className="py-8 text-[13px] text-earth-600">No contacts found.</p>}
            {groups.map(g => {
              const isCollapsed = collapsed.has(g.id)
              return (
                <section key={g.id}>
                  <SectionHeading
                    as="h3"
                    title={g.title}
                    meta={
                      <button type="button" onClick={() => toggleGroup(g.id)} aria-expanded={!isCollapsed} className="uppercase tracking-[0.14em] hover:underline underline-offset-4">
                        {g.date} · {g.contacts.length} {g.contacts.length === 1 ? 'person' : 'people'} · {isCollapsed ? 'Show' : 'Hide'}
                      </button>
                    }
                  />
                  {!isCollapsed && (
                    <div role="table" className="border-t border-night/20">
                      {g.contacts.map(c => (
                        <CrmRow key={c.id} template={TEMPLATE} selected={c.id === openId} onOpen={() => open(c.id)} label={`Open ${c.nome} ${c.cognome}`}>
                          <span className={cell(COLUMNS[0])}>
                            <NameCell
                              name={`${c.nome} ${c.cognome}`}
                              tag={c.source === 'manual' ? <Tag title={c.added_by ? `Added by hand by ${c.added_by}` : 'Added by hand'}>Manual</Tag> : undefined}
                            />
                          </span>
                          <span className={cell(COLUMNS[1], 'text-[12px] text-earth-700')} title={c.email}>{c.email}</span>
                          <span className={cell(COLUMNS[2], 'text-[12px] text-earth-700')}>{yearLabel(c.anno_di_studio)}</span>
                          <span className={cell(COLUMNS[3], 'text-[12px] text-earth-700')}>
                            {c.is_member ? 'Member' : 'External'}{c.member_override !== null ? '*' : ''}
                            {c.checked_in && <span className="rd-eyebrow block text-[9px] text-club">Checked in</span>}
                          </span>
                        </CrmRow>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        }
        sheet={
          current ? (
            <Sheet
              title="Contact"
              meta={current.source === 'manual' ? 'Added by hand' : 'Self registered'}
              actions={
                deleteConfirm === current.id ? (
                  <>
                    <span className="text-[13px]">Delete this registration?</span>
                    <button type="button" onClick={() => handleDelete(current.id)} disabled={deleting} className={btnDanger}>Yes, delete</button>
                    <button type="button" onClick={() => setDeleteConfirm(null)} className={btnGhost}>No</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setEditContact(current)} className={btnPrimary}>Edit</button>
                    <button type="button" onClick={() => setDeleteConfirm(current.id)} className={btnGhost}>Delete</button>
                  </>
                )
              }
            >
              <FieldRow label="Name" value={`${current.nome} ${current.cognome}`} />
              <FieldRow label="Email" value={<a href={`mailto:${current.email}`} className="hover:underline">{current.email}</a>} />
              <FieldRow label="Phone" value={current.telefono ?? '—'} muted={!current.telefono} />
              <FieldRow label="Year" value={current.anno_di_studio || '—'} />
              <FieldRow label="Event" value={current.upcoming_events?.title ?? '—'} />
              <FieldRow label="Event date" value={current.upcoming_events?.date ?? '—'} />
              <FieldRow
                label="Status"
                value={current.is_member ? 'Member' : 'External'}
                aside={current.member_override !== null ? 'Set by hand' : 'Automatic'}
              />
              <FieldRow label="Source" value={current.source === 'manual' ? `Manual${current.added_by ? `, ${current.added_by}` : ''}` : 'Self registered'} />
              <FieldRow label="Check-in" value={current.checked_in ? `Yes, ${fmtDate(current.checked_in_at)}` : 'Not yet'} muted={!current.checked_in} />
              <FieldRow label="Registered" value={fmtDate(current.created_at)} />
              {current.motivazione && <BlockField label="Motivation">{current.motivazione}</BlockField>}
              {current.questions_for_panelists && <BlockField label="Questions for panelists">{current.questions_for_panelists}</BlockField>}
            </Sheet>
          ) : (
            <SheetEmpty title="Contact" text="Open a contact from the list. Choose an event to add participants or send the QR codes." />
          )
        }
      />

      {editContact && (
        <EditParticipantModal
          contact={editContact}
          onSave={handleSaved}
          onClose={() => setEditContact(null)}
        />
      )}

      {showAddModal && selectedEvent && (
        <AddParticipantModal
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onAdded={handleAdded}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  )
}
