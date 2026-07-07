'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type PRContact = {
  id: string
  number: number | null
  nome: string
  firm: string | null
  ruolo: string | null
  source: string | null
  contattato: string | null
  status: 'risposto' | 'in_attesa' | 'non_risposto' | 'referral' | 'call_incontro' | null
  contesto_note: string | null
  next_action: string | null
  email: string | null
}

const STATUS_OPTIONS: { value: PRContact['status']; label: string }[] = [
  { value: 'risposto',      label: '✅ Risposto' },
  { value: 'in_attesa',     label: '⏳ In attesa' },
  { value: 'non_risposto',  label: '❌ Non risposto' },
  { value: 'referral',      label: '🔄 Referral' },
  { value: 'call_incontro', label: '📞 Call/Incontro' },
]

function statusBadge(status: PRContact['status']) {
  if (!status) return null
  const map: Record<string, { bg: string; text: string; label: string }> = {
    risposto:      { bg: '#dcfce7', text: '#166534', label: '✅ Risposto' },
    in_attesa:     { bg: '#fef9c3', text: '#854d0e', label: '⏳ In attesa' },
    non_risposto:  { bg: '#fee2e2', text: '#991b1b', label: '❌ Non risposto' },
    referral:      { bg: '#dbeafe', text: '#1e40af', label: '🔄 Referral' },
    call_incontro: { bg: '#ede9fe', text: '#5b21b6', label: '📞 Call/Incontro' },
  }
  const s = map[status]
  if (!s) return null
  return (
    <span
      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const EMPTY_FORM: Omit<PRContact, 'id'> = {
  number: null,
  nome: '',
  firm: '',
  ruolo: '',
  source: '',
  contattato: '',
  status: null,
  contesto_note: '',
  next_action: '',
  email: '',
}

function ContactModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Omit<PRContact, 'id'> & { id?: string }
  onSave: (contact: PRContact) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<PRContact, 'id'>>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      number: form.number ?? null,
      nome: form.nome.trim(),
      firm: form.firm?.trim() || null,
      ruolo: form.ruolo?.trim() || null,
      source: form.source?.trim() || null,
      contattato: form.contattato || null,
      status: form.status || null,
      contesto_note: form.contesto_note?.trim() || null,
      next_action: form.next_action?.trim() || null,
      email: form.email?.trim() || null,
    }

    if (initial.id) {
      const { data, error: err } = await supabase
        .from('pr_contacts')
        .update(payload)
        .eq('id', initial.id)
        .select('*')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as PRContact)
    } else {
      const { data, error: err } = await supabase
        .from('pr_contacts')
        .insert(payload)
        .select('*')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as PRContact)
    }
    setSaving(false)
  }

  const inputClass =
    'w-full border border-line px-3 py-2 text-sm font-[\'Inter\'] bg-white focus:outline-none focus:border-forest text-ink-900'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-ink-400 mb-1 font-medium'

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">
            {initial.id ? 'Edit Contact' : 'Add Contact'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>#</label>
              <input
                type="number"
                value={form.number ?? ''}
                onChange={e => set('number', e.target.value ? Number(e.target.value) : null)}
                className={inputClass}
                placeholder="1"
              />
            </div>
            <div>
              <label className={labelClass}>Nome *</label>
              <input
                required
                value={form.nome}
                onChange={e => set('nome', e.target.value)}
                className={inputClass}
                placeholder="Mario Rossi"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Firm</label>
              <input
                value={form.firm ?? ''}
                onChange={e => set('firm', e.target.value)}
                className={inputClass}
                placeholder="Goldman Sachs"
              />
            </div>
            <div>
              <label className={labelClass}>Ruolo</label>
              <input
                value={form.ruolo ?? ''}
                onChange={e => set('ruolo', e.target.value)}
                className={inputClass}
                placeholder="Analyst"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Source</label>
              <input
                value={form.source ?? ''}
                onChange={e => set('source', e.target.value)}
                className={inputClass}
                placeholder="LinkedIn / referral"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={e => set('email', e.target.value)}
                className={inputClass}
                placeholder="mario@firm.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contattato</label>
              <input
                type="date"
                value={form.contattato ?? ''}
                onChange={e => set('contattato', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status ?? ''}
                onChange={e => set('status', (e.target.value || null) as PRContact['status'])}
                className={inputClass}
              >
                <option value="">— nessuno —</option>
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value ?? ''}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Contesto & Note</label>
            <textarea
              rows={3}
              value={form.contesto_note ?? ''}
              onChange={e => set('contesto_note', e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Contesto del contatto, note..."
            />
          </div>

          <div>
            <label className={labelClass}>Next Action</label>
            <textarea
              rows={2}
              value={form.next_action ?? ''}
              onChange={e => set('next_action', e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Prossimo step..."
            />
          </div>

          {error && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>
          )}

          <div className="flex items-center gap-4 pt-2 border-t border-line">
            <button
              type="submit"
              disabled={saving || !form.nome.trim()}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-widest px-6 py-2.5 transition-colors disabled:opacity-40"
            >
              {saving ? '…' : initial.id ? 'Salva' : 'Aggiungi'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-ink-500 hover:text-ink-900"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PRTracker() {
  const [contacts, setContacts] = useState<PRContact[]>([])
  const [loading, setLoading] = useState(true)
  const [modalData, setModalData] = useState<(Omit<PRContact, 'id'> & { id?: string }) | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PRContact['status'] | ''>('')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('pr_contacts')
      .select('*')
      .order('number', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        setContacts((data ?? []) as PRContact[])
        setLoading(false)
      })
  }, [])

  function openAdd() {
    setModalData({ ...EMPTY_FORM })
  }

  function openEdit(c: PRContact) {
    setModalData({
      id: c.id,
      number: c.number,
      nome: c.nome,
      firm: c.firm ?? '',
      ruolo: c.ruolo ?? '',
      source: c.source ?? '',
      contattato: c.contattato ?? '',
      status: c.status,
      contesto_note: c.contesto_note ?? '',
      next_action: c.next_action ?? '',
      email: c.email ?? '',
    })
  }

  function handleSaved(contact: PRContact) {
    setContacts(prev => {
      const exists = prev.find(c => c.id === contact.id)
      const updated = exists
        ? prev.map(c => c.id === contact.id ? contact : c)
        : [...prev, contact]
      return [...updated].sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity))
    })
    setModalData(null)
  }

  async function handleDelete(id: string) {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('pr_contacts').delete().eq('id', id)
    if (!error) {
      setContacts(prev => prev.filter(c => c.id !== id))
    }
    setDeleteConfirm(null)
    setDeleting(false)
  }

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || [c.nome, c.firm, c.ruolo, c.email].some(f => f?.toLowerCase().includes(q))
    const matchStatus = !statusFilter || c.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) {
    return <p className="text-sm text-ink-500 py-8">Caricamento...</p>
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cerca nome, firm, ruolo, email..."
            className="border border-line px-3 py-2 text-sm font-['Inter'] bg-white focus:outline-none focus:border-forest w-64"
          />
          <select
            value={statusFilter ?? ''}
            onChange={e => setStatusFilter((e.target.value || '') as PRContact['status'] | '')}
            className="border border-line px-3 py-2 text-sm font-['Inter'] bg-white focus:outline-none focus:border-forest"
          >
            <option value="">Tutti gli status</option>
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value ?? ''}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={openAdd}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-widest px-5 py-2.5 transition-colors whitespace-nowrap"
        >
          + Add Contact
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-line">
        <table className="w-full text-sm font-['Inter'] border-collapse">
          <thead>
            <tr className="bg-forest text-white">
              {['#', 'NOME', 'FIRM', 'RUOLO', 'SOURCE', 'CONTATTATO', 'STATUS', 'CONTESTO & NOTE', 'NEXT ACTION', 'EMAIL', ''].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-ink-500 text-sm py-12">
                  {contacts.length === 0 ? 'Nessun contatto. Aggiungine uno.' : 'Nessun risultato.'}
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr
                  key={c.id}
                  className="border-b border-line hover:bg-[#f5f9f7] transition-colors"
                  onMouseEnter={() => setHoveredRow(c.id)}
                  onMouseLeave={() => { if (deleteConfirm !== c.id) setHoveredRow(null) }}
                >
                  <td className="px-4 py-3 text-ink-400 text-xs whitespace-nowrap">{c.number ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-ink-900 whitespace-nowrap">{c.nome}</td>
                  <td className="px-4 py-3 text-ink-700 whitespace-nowrap">{c.firm ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{c.ruolo ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{c.source ?? '—'}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{fmtDate(c.contattato)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{statusBadge(c.status) ?? <span className="text-ink-300">—</span>}</td>
                  <td className="px-4 py-3 text-ink-600 text-xs max-w-[200px]">
                    {c.contesto_note ? (
                      <span title={c.contesto_note}>
                        {c.contesto_note.length > 80 ? c.contesto_note.slice(0, 80) + '…' : c.contesto_note}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-600 text-xs max-w-[160px]">
                    {c.next_action ? (
                      <span title={c.next_action}>
                        {c.next_action.length > 60 ? c.next_action.slice(0, 60) + '…' : c.next_action}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap">
                    {c.email ? (
                      <a href={`mailto:${c.email}`} className="hover:text-forest hover:underline">{c.email}</a>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {deleteConfirm === c.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">Eliminare?</span>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 border border-red-300 px-2 py-1 disabled:opacity-40"
                        >
                          {deleting ? '…' : 'Sì'}
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(null); setHoveredRow(null) }}
                          className="text-xs text-ink-400 hover:text-ink-700 border border-line px-2 py-1"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 transition-opacity"
                        style={{ opacity: hoveredRow === c.id ? 1 : 0 }}
                      >
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-ink-400 hover:text-forest transition-colors"
                          title="Modifica"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setDeleteConfirm(c.id); setHoveredRow(c.id) }}
                          className="p-1.5 text-ink-400 hover:text-red-500 transition-colors"
                          title="Elimina"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink-400 mt-3">{filtered.length} contatti{statusFilter || search ? ` filtrati` : ''}</p>

      {modalData && (
        <ContactModal
          initial={modalData}
          onSave={handleSaved}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  )
}
