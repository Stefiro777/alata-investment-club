'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
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
const TYPE_COLORS: Record<CustomerType, string> = {
  career_service: 'bg-blue-100 text-blue-800',
  merch:          'bg-purple-100 text-purple-800',
  event:          'bg-orange-100 text-orange-700',
  membership:     'bg-[#edf7f0] text-forest',
}

const inputCls = 'border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white w-full'
const btnGreen = 'bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest px-4 py-2 transition-colors disabled:opacity-40'
const btnOutline = 'border border-forest text-forest hover:bg-forest hover:text-white text-xs font-semibold uppercase tracking-widest px-4 py-2 transition-colors disabled:opacity-40'

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
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold uppercase tracking-widest">Invia Email a {count} selezionati</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900">✕</button>
          </div>
          {result ? (
            <div className="text-center py-6">
              <p className="text-forest font-semibold">Inviate {result.sent}/{result.total} email con successo.</p>
              <button onClick={onClose} className={`mt-4 ${btnGreen}`}>Chiudi</button>
            </div>
          ) : (
            <div className="space-y-4">
              {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{err}</p>}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-500 block mb-1">Oggetto</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-500 block mb-1">Corpo</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                  className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white w-full resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={send} disabled={sending} className={`flex-1 py-3 ${btnGreen}`}>
                  {sending ? `Invio in corso…` : `Invia a ${count} destinatari`}
                </button>
                <button onClick={onClose} className="px-4 py-3 border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Annulla</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Add customer form ──────────────────────────────────────────────────────────

function AddCustomerForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen]   = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr]     = useState('')
  const [form, setForm]   = useState({
    name: '', email: '', phone: '', type: 'career_service' as CustomerType,
    reference: '', amount: '', purchased_at: new Date().toISOString().slice(0, 10), notes: '',
  })

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
    setOpen(false)
    setForm({ name: '', email: '', phone: '', type: 'career_service', reference: '', amount: '', purchased_at: new Date().toISOString().slice(0, 10), notes: '' })
    onAdded()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className={btnGreen}>+ Aggiungi cliente</button>
  )

  return (
    <div className="border border-forest p-5 mb-6 bg-white">
      <p className="text-xs font-bold uppercase tracking-widest text-forest mb-4">Nuovo cliente</p>
      {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 mb-3">{err}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Nome *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} /></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} /></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Telefono</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inputCls} /></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Tipo *</label>
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CustomerType }))} className={inputCls}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Servizio / Prodotto</label>
          <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} className={inputCls} /></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Importo (€)</label>
          <input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className={inputCls} /></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Data acquisto</label>
          <input type="date" value={form.purchased_at} onChange={e => setForm(f => ({ ...f, purchased_at: e.target.value }))} className={inputCls} /></div>
        <div><label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Note</label>
          <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
      </div>
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className={btnGreen}>{saving ? 'Salvo…' : 'Salva'}</button>
        <button onClick={() => setOpen(false)} className="border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">Annulla</button>
      </div>
    </div>
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
  const [expanded,  setExpanded]  = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [showEmail, setShowEmail] = useState(false)

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

  useEffect(() => { load() }, [load])

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === customers.length) setSelected(new Set())
    else setSelected(new Set(customers.map(c => c.id)))
  }

  function openExpand(c: Customer) {
    if (expanded === c.id) { setExpanded(null); return }
    setExpanded(c.id)
    setEditNotes(c.notes ?? '')
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
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes: editNotes } : c))
    setExpanded(null)
  }

  const selectedIds = Array.from(selected)

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          placeholder="Cerca nome o email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white w-56"
        />
        <div className="flex border border-gray-200 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {(['all', 'career_service', 'merch', 'event', 'membership'] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-2 text-xs uppercase tracking-wide transition-colors whitespace-nowrap flex-shrink-0"
              style={typeFilter === t ? { background: 'var(--forest)', color: '#fff' } : { color: '#6b7280' }}>
              {t === 'all' ? 'Tutti' : TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <AddCustomerForm onAdded={load} />
        </div>
      </div>

      {fetchErr && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-3 mb-4">
          {fetchErr} <button onClick={load} className="ml-2 underline">Riprova</button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-6">Caricamento…</p>
      ) : (
        <div className="border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={customers.length > 0 && selected.size === customers.length}
                    onChange={toggleAll} className="accent-forest" />
                </th>
                {['Nome', 'Email', 'Tipo', 'Servizio/Prodotto', 'Importo', 'Data acquisto'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 text-sm py-10">Nessun cliente trovato.</td></tr>
              ) : customers.map(c => (
                <>
                  <tr key={c.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${selected.has(c.id) ? 'bg-[#f0f8f4]' : ''}`}
                    onClick={() => openExpand(c)}>
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleSelect(c.id) }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                        onClick={e => e.stopPropagation()} className="accent-forest" />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 ${TYPE_COLORS[c.type]}`}>
                        {TYPE_LABELS[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">{c.reference ?? '—'}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{c.amount != null ? fmtAmt(c.amount) : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(c.purchased_at)}</td>
                  </tr>
                  {expanded === c.id && (
                    <tr key={`${c.id}-exp`} className="bg-[#f9f9f9]">
                      <td colSpan={7} className="px-6 py-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Note</p>
                        <textarea
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          rows={3}
                          className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white w-full max-w-xl resize-none mb-2"
                          onClick={e => e.stopPropagation()}
                        />
                        <div className="flex gap-2">
                          <button onClick={e => { e.stopPropagation(); saveNotes(c.id) }}
                            disabled={savingNote} className={btnGreen}>
                            {savingNote ? '…' : 'Salva note'}
                          </button>
                          <button onClick={e => { e.stopPropagation(); setExpanded(null) }}
                            className="border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                            Chiudi
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-forest text-white px-6 py-3 shadow-xl flex items-center gap-6">
          <span className="text-sm font-semibold">{selected.size} selezionati</span>
          <button onClick={() => setShowEmail(true)} className="text-xs font-semibold uppercase tracking-widest border border-white/40 px-4 py-2 hover:bg-white/10 transition-colors">
            Invia email a {selected.size} selezionati
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-white/60 hover:text-white transition-colors">Deseleziona</button>
        </div>
      )}

      {showEmail && (
        <EmailModal ids={selectedIds} count={selected.size} onClose={() => setShowEmail(false)} />
      )}
    </div>
  )
}
