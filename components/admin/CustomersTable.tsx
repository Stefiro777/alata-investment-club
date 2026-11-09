'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { FieldRow, SegmentedPills } from '@/app/components/member/ui'
import {
  Numbers, Toolbar, SearchField, Split, CrmTable, CrmRow, NameCell, Sheet, SheetEmpty, Dialog,
  cell, fmtDate, revealSheet, fieldCls, labelCls, btnPrimary, btnGhost, errorCls, type Column,
} from './crm/ui'

const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────────────

type CustomerType = 'career_service' | 'merch' | 'event' | 'membership'

interface Customer {
  id: string
  name: string
  email: string
  phone: string | null
  type: CustomerType
  reference: string | null
  amount: number | null
  purchased_at: string
  notes: string | null
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

function fmtAmt(n: number) {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const TYPE_LABELS: Record<CustomerType, string> = {
  career_service: 'Career Service',
  merch: 'Merch',
  event: 'Event',
  membership: 'Membership',
}

const TYPE_FILTERS = [
  { value: 'all', label: 'Tutti' },
  ...(Object.keys(TYPE_LABELS) as CustomerType[]).map(t => ({ value: t, label: TYPE_LABELS[t] })),
]

const COLUMNS: Column[] = [
  { label: '' },
  { label: 'Nome' },
  { label: 'Tipo', wide: true },
  { label: 'Importo', align: 'right' },
  { label: 'Data', wide: true, align: 'right' },
]
const TEMPLATE = 'grid-cols-[20px_minmax(0,1fr)_80px] sm:grid-cols-[20px_minmax(0,1fr)_104px_80px_88px]'

// ── Email modal ────────────────────────────────────────────────────────────────

function EmailModal({ ids, count, onClose }: { ids: string[]; count: number; onClose: () => void }) {
  const [subject, setSubject] = useState('')
  const [body,    setBody]    = useState('')
  const [sending, setSending] = useState(false)
  const [result,  setResult]  = useState<{ sent: number; total: number } | null>(null)
  const [err,     setErr]     = useState('')

  async function send() {
    if (!subject || !body) { setErr('Oggetto e corpo richiesti'); return }
    setSending(true); setErr('')
    const token = await getToken()
    const res = await fetch('/api/crm/customers/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids, subject, body }),
    }).then(r => r.json())
    setSending(false)
    if (res.error) { setErr(res.error); return }
    setResult(res)
  }

  return (
    <Dialog title="Invia email" sub={`${count} selezionati`} onClose={onClose} busy={sending}>
      {result ? (
        <div className="space-y-5 py-4 text-center">
          <p className="text-[13px]">Inviate {result.sent}/{result.total} email con successo.</p>
          <button type="button" onClick={onClose} className={btnGhost}>Chiudi</button>
        </div>
      ) : (
        <div className="space-y-5">
          {err && <p className={errorCls}>{err}</p>}
          <label className="block"><span className={labelCls}>Oggetto</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} className={fieldCls} /></label>
          <label className="block"><span className={labelCls}>Corpo</span>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={6} className={`${fieldCls} resize-none`} /></label>
          <div className="flex justify-end gap-2 border-t border-night/20 pt-4">
            <button type="button" onClick={onClose} className={btnGhost}>Annulla</button>
            <button type="button" onClick={send} disabled={sending} className={btnPrimary}>
              {sending ? 'Invio in corso…' : `Invia a ${count} destinatari`}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

// ── Add customer dialog ────────────────────────────────────────────────────────

const EMPTY_FORM = () => ({
  name: '', email: '', phone: '', type: 'career_service' as CustomerType,
  reference: '', amount: '', purchased_at: new Date().toISOString().slice(0, 10), notes: '',
})

function AddCustomerModal({ onAdded, onClose }: { onAdded: () => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')
  const [form, setForm]   = useState(EMPTY_FORM)

  async function save() {
    if (!form.name || !form.email) { setErr('Nome e email richiesti'); return }
    setSaving(true); setErr('')
    const token = await getToken()
    const res = await fetch('/api/crm/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, amount: form.amount ? parseFloat(form.amount) : null }),
    }).then(r => r.json())
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onAdded()
  }

  const field = (key: keyof ReturnType<typeof EMPTY_FORM>, label: string, type = 'text') => (
    <label className="block"><span className={labelCls}>{label}</span>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={fieldCls}
        {...(type === 'number' ? { min: 0, step: '0.01' } : {})} /></label>
  )

  return (
    <Dialog title="Nuovo cliente" onClose={onClose} busy={saving}>
      <div className="space-y-5">
        {err && <p className={errorCls}>{err}</p>}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {field('name', 'Nome *')}
          {field('email', 'Email *', 'email')}
          {field('phone', 'Telefono')}
          <label className="block"><span className={labelCls}>Tipo *</span>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CustomerType }))} className={`${fieldCls} cursor-pointer`}>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          {field('reference', 'Servizio / Prodotto')}
          {field('amount', 'Importo (€)', 'number')}
          {field('purchased_at', 'Data acquisto', 'date')}
          {field('notes', 'Note')}
        </div>
        <div className="flex justify-end gap-2 border-t border-night/20 pt-4">
          <button type="button" onClick={onClose} className={btnGhost}>Annulla</button>
          <button type="button" onClick={save} disabled={saving} className={btnPrimary}>{saving ? 'Salvo…' : 'Salva'}</button>
        </div>
      </div>
    </Dialog>
  )
}

// ── Main table ─────────────────────────────────────────────────────────────────

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading,   setLoading]   = useState(true)
  const [fetchErr,  setFetchErr]  = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [openId,    setOpenId]    = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showAdd,   setShowAdd]   = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true); setFetchErr(null)
    const token = await getToken()
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (search) params.set('search', search)
    const res = await fetch(`/api/crm/customers?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (!res.ok) { setFetchErr(data?.error ?? `Errore ${res.status}`); setLoading(false); return }
    setCustomers(data.customers ?? [])
    setLoading(false)
  }, [typeFilter, search])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount: state is set after the request resolves
  useEffect(() => { load() }, [load])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === customers.length) setSelected(new Set())
    else setSelected(new Set(customers.map(c => c.id)))
  }

  function open(c: Customer) {
    setOpenId(c.id)
    setEditNotes(c.notes ?? '')
    setNoteSaved(false)
    revealSheet(sheetRef.current)
  }

  async function saveNotes(id: string) {
    setSavingNote(true)
    const token = await getToken()
    await fetch(`/api/crm/customers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes: editNotes }),
    })
    setSavingNote(false)
    setNoteSaved(true)
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes: editNotes } : c))
  }

  const selectedIds = Array.from(selected)
  const current = customers.find(c => c.id === openId) ?? null
  const total = customers.reduce((s, c) => s + (c.amount ?? 0), 0)
  const allSelected = customers.length > 0 && selected.size === customers.length

  return (
    <div>
      <Numbers items={[
        { value: customers.length, label: 'Clienti' },
        { value: `€${Math.round(total).toLocaleString('it-IT')}`, label: 'Importo totale' },
        { value: customers.filter(c => c.type === 'merch').length, label: 'Merch' },
        { value: customers.filter(c => c.type === 'career_service').length, label: 'Career Service' },
      ]} />

      <Toolbar
        actions={
          <>
            <button type="button" onClick={() => setShowEmail(true)} disabled={selected.size === 0} className={btnGhost}>
              Invia email{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className={btnPrimary}>Aggiungi cliente</button>
          </>
        }
      >
        <SearchField value={search} onChange={setSearch} placeholder="Nome o email…" />
        <div>
          <span className={`${labelCls} mb-2`}>Tipo</span>
          <SegmentedPills size="sm" label="Tipo" options={TYPE_FILTERS} value={typeFilter} onChange={setTypeFilter} />
        </div>
      </Toolbar>

      {fetchErr && (
        <p className={`${errorCls} mt-6`}>
          {fetchErr} <button type="button" onClick={load} className="ml-2 underline">Riprova</button>
        </p>
      )}

      {loading && customers.length === 0 ? (
        <p className="py-10 text-[13px] text-earth-600">Caricamento…</p>
      ) : (
        <Split
          sheetRef={sheetRef}
          list={
            <CrmTable
              title="Clienti"
              meta={loading ? 'Caricamento…' : customers.length}
              columns={[{ label: <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={customers.length === 0} aria-label="Seleziona tutti" className="h-3.5 w-3.5 cursor-pointer accent-[#1a4a3a]" /> }, ...COLUMNS.slice(1)]}
              template={TEMPLATE}
              isEmpty={customers.length === 0}
              empty="Nessun cliente trovato."
            >
              {customers.map(c => (
                <CrmRow
                  key={c.id}
                  template={TEMPLATE}
                  selected={c.id === openId}
                  onOpen={() => open(c)}
                  label={`Apri ${c.name}`}
                  lead={
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      aria-label={`Seleziona ${c.name}`}
                      className="h-3.5 w-3.5 cursor-pointer accent-[#1a4a3a]"
                    />
                  }
                >
                  <span className={cell(COLUMNS[1])}><NameCell name={c.name} sub={c.reference ? `${c.email} · ${c.reference}` : c.email} /></span>
                  <span className={cell(COLUMNS[2], 'text-[12px] text-earth-700')}>{TYPE_LABELS[c.type]}</span>
                  <span className={cell(COLUMNS[3], 'rd-num text-[12px] text-earth-700')}>{c.amount != null ? fmtAmt(c.amount) : '—'}</span>
                  <span className={cell(COLUMNS[4], 'rd-num text-[12px] text-earth-700')}>{fmtDate(c.purchased_at)}</span>
                </CrmRow>
              ))}
            </CrmTable>
          }
          sheet={
            current ? (
              <Sheet
                title="Cliente"
                meta={TYPE_LABELS[current.type]}
                actions={
                  <button type="button" onClick={() => toggleSelect(current.id)} className={selected.has(current.id) ? btnPrimary : btnGhost}>
                    {selected.has(current.id) ? 'Selezionato per email' : 'Seleziona per email'}
                  </button>
                }
              >
                <FieldRow label="Nome" value={current.name} />
                <FieldRow label="Email" value={<a href={`mailto:${current.email}`} className="hover:underline">{current.email}</a>} />
                <FieldRow label="Telefono" value={current.phone || '—'} muted={!current.phone} />
                <FieldRow label="Tipo" value={TYPE_LABELS[current.type]} />
                <FieldRow label="Prodotto" value={current.reference || '—'} muted={!current.reference} />
                <FieldRow label="Importo" value={current.amount != null ? fmtAmt(current.amount) : '—'} muted={current.amount == null} />
                <FieldRow label="Acquisto" value={fmtDate(current.purchased_at)} />
                <FieldRow label="Inserito" value={fmtDate(current.created_at)} />
                <div className="border-b border-night/20 py-[11px]">
                  <label className="block">
                    <span className={labelCls}>Note</span>
                    <textarea
                      value={editNotes}
                      onChange={e => { setEditNotes(e.target.value); setNoteSaved(false) }}
                      rows={3}
                      className={`${fieldCls} resize-none`}
                    />
                  </label>
                  <div className="mt-3 flex items-center gap-3">
                    <button type="button" onClick={() => saveNotes(current.id)} disabled={savingNote || editNotes === (current.notes ?? '')} className={btnPrimary}>
                      {savingNote ? '…' : 'Salva note'}
                    </button>
                    {noteSaved && <span className="text-[12px] text-earth-600">Salvate.</span>}
                  </div>
                </div>
              </Sheet>
            ) : (
              <SheetEmpty title="Cliente" text="Apri un cliente dall'elenco. Spunta le caselle per scrivere a più clienti insieme." />
            )
          }
        />
      )}

      {showEmail && (
        <EmailModal ids={selectedIds} count={selected.size} onClose={() => setShowEmail(false)} />
      )}
      {showAdd && (
        <AddCustomerModal onAdded={() => { setShowAdd(false); load() }} onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
