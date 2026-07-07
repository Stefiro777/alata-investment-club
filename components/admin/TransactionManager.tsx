'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type TxType = 'revenue' | 'cost' | 'rimborso'

type Transaction = {
  id: string
  type: TxType
  date: string
  amount: number
  description: string
  category_id: string | null
  note: string | null
  receipt_url: string | null
  created_at: string
}

type BudgetCategory = {
  id: string
  name: string
  type: string
}

const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function getLast24Months(): { year: number; month: number; label: string; key: string }[] {
  const result = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
  }
  return result
}

function fmtAmt(n: number) {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function typeBadge(type: TxType) {
  if (type === 'revenue') return (
    <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 bg-green-100 text-green-800">▲ REV</span>
  )
  if (type === 'rimborso') return (
    <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 bg-orange-100 text-orange-800">↩ RIM</span>
  )
  return (
    <span className="text-[10px] font-semibold tracking-wide px-2 py-0.5 bg-red-100 text-red-800">▼ COST</span>
  )
}

function DescriptionCell({ description, note }: { description: string; note: string | null }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setExpanded(v => !v)}
      className="text-left w-full group"
    >
      <span className="flex items-start gap-1">
        <span className={expanded ? 'whitespace-pre-wrap break-words text-ink-900 font-medium' : 'block truncate text-ink-900 font-medium'}>
          {description}
        </span>
        <svg
          className={`w-3 h-3 flex-shrink-0 mt-1 text-ink-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </span>
      {note && (
        <p className={`text-[10px] text-ink-400 mt-0.5 ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>{note}</p>
      )}
    </button>
  )
}

function rowBg(type: TxType) {
  if (type === 'revenue') return 'bg-green-50/60'
  if (type === 'rimborso') return 'bg-orange-50/60'
  return 'bg-red-50/40'
}

const EMPTY_FORM = {
  type: 'revenue' as TxType,
  isRimborso: false,
  date: new Date().toISOString().split('T')[0],
  amount: '',
  description: '',
  category_id: '',
  note: '',
  receipt_url: '',
}

function TxModal({
  initial,
  categories,
  onSave,
  onClose,
}: {
  initial: typeof EMPTY_FORM & { id?: string }
  categories: BudgetCategory[]
  onSave: (tx: Transaction) => void
  onClose: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [localCats, setLocalCats] = useState<BudgetCategory[]>(categories)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const effectiveType: TxType = form.isRimborso ? 'rimborso' : form.type

  const filteredCats = localCats.filter(c => {
    if (!c.type || c.type === 'both') return true
    if (effectiveType === 'revenue') return c.type === 'revenue' || c.type === 'both'
    return c.type === 'cost' || c.type === 'both'
  })

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/finance/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (json.url) set('receipt_url', json.url)
    else setError(json.error ?? 'Upload failed')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleAddCat() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const supabase = createClient()
    const catType = effectiveType === 'revenue' ? 'revenue' : 'cost'
    const { data, error: err } = await supabase
      .from('budget_categories')
      .insert({ name: newCatName.trim(), type: catType })
      .select('*')
      .single()
    if (!err && data) {
      const cat = data as BudgetCategory
      setLocalCats(prev => [...prev, cat])
      set('category_id', cat.id)
      setNewCatName('')
    }
    setAddingCat(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(String(form.amount))
    if (!form.description.trim() || isNaN(amount) || amount <= 0) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const payload = {
      type: effectiveType,
      date: form.date,
      amount,
      description: form.description.trim(),
      category_id: form.category_id || null,
      note: form.note.trim() || null,
      receipt_url: form.receipt_url || null,
    }

    if (initial.id) {
      const { data, error: err } = await supabase
        .from('transactions')
        .update(payload)
        .eq('id', initial.id)
        .select('*')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Transaction)
    } else {
      const { data, error: err } = await supabase
        .from('transactions')
        .insert(payload)
        .select('*')
        .single()
      if (err) { setError(err.message); setSaving(false); return }
      onSave(data as Transaction)
    }
    setSaving(false)
  }

  const inputClass = 'w-full border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest text-ink-900 font-[\'Inter\']'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-ink-400 font-medium mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">
            {initial.id ? 'Modifica Transazione' : 'Nuova Transazione'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          {/* Type toggle */}
          <div>
            <label className={labelClass}>Tipo</label>
            <div className="flex gap-2">
              {(['revenue', 'cost'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-2 text-xs font-semibold tracking-wide border transition-colors ${
                    form.type === t
                      ? t === 'revenue'
                        ? 'bg-green-700 text-white border-green-700'
                        : 'bg-red-700 text-white border-red-700'
                      : 'bg-white text-ink-500 border-line hover:border-ink-700'
                  }`}
                >
                  {t === 'revenue' ? '▲ REVENUE' : '▼ COST'}
                </button>
              ))}
            </div>
            {form.type === 'cost' && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRimborso}
                  onChange={e => set('isRimborso', e.target.checked)}
                  className="w-4 h-4 accent-forest"
                />
                <span className="text-sm text-ink-700">È un rimborso?</span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Data *</label>
              <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Importo (€) *</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descrizione *</label>
            <input
              required
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Descrizione transazione"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Categoria</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={inputClass}>
              <option value="">— nessuna —</option>
              {filteredCats.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex gap-2 mt-1.5">
              <input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="+ Nuova categoria..."
                className="flex-1 border border-dashed border-ink-300 px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-forest"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCat() } }}
              />
              <button
                type="button"
                onClick={handleAddCat}
                disabled={addingCat || !newCatName.trim()}
                className="border border-forest text-forest hover:bg-forest hover:text-white text-xs px-3 py-1.5 transition-colors disabled:opacity-40"
              >
                {addingCat ? '…' : 'Aggiungi'}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Note</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={e => set('note', e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="Note opzionali..."
            />
          </div>

          <div>
            <label className={labelClass}>Ricevuta</label>
            <div className="flex gap-2">
              <input
                value={form.receipt_url}
                onChange={e => set('receipt_url', e.target.value)}
                placeholder="URL o carica file"
                className="flex-1 border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:border-forest text-ink-900"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {uploading ? '…' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}

          <div className="flex items-center gap-4 pt-2 border-t border-line">
            <button
              type="submit"
              disabled={saving}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-widest px-6 py-2.5 transition-colors disabled:opacity-40"
            >
              {saving ? '…' : initial.id ? 'Salva' : 'Aggiungi'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteModal({ onConfirm, onClose, deleting }: { onConfirm: () => void; onClose: () => void; deleting: boolean }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-sm shadow-2xl p-8 text-center">
        <p className="font-serif text-lg font-bold text-ink-900 mb-2">Elimina transazione?</p>
        <p className="text-sm text-ink-500 mb-6">Questa operazione non può essere annullata.</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-medium uppercase tracking-widest px-6 py-2.5 transition-colors disabled:opacity-40"
          >
            {deleting ? '…' : 'Elimina'}
          </button>
          <button onClick={onClose} className="border border-line text-ink-500 hover:text-ink-900 text-xs font-medium uppercase tracking-widest px-6 py-2.5 transition-colors">
            Annulla
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TransactionManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const months = getLast24Months()
  const currentKey = months[months.length - 1].key
  const [selectedKey, setSelectedKey] = useState(currentKey)
  const pillsRef = useRef<HTMLDivElement>(null)

  const [modalData, setModalData] = useState<(typeof EMPTY_FORM & { id?: string }) | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('budget_categories').select('*').order('name'),
    ]).then(([{ data: txs }, { data: cats }]) => {
      setTransactions((txs ?? []) as Transaction[])
      setCategories((cats ?? []) as BudgetCategory[])
      setLoading(false)
    })
  }, [])

  // Scroll pills to end (current month) on mount
  useEffect(() => {
    if (pillsRef.current) {
      pillsRef.current.scrollLeft = pillsRef.current.scrollWidth
    }
  }, [loading])

  function txKey(date: string) {
    return date.slice(0, 7)
  }

  // KPI totals across ALL transactions
  const totalRevenue = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const totalCosts = transactions.filter(t => t.type === 'cost' || t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
  const balance = totalRevenue - totalCosts

  // Per-month saldo for pill display
  function monthSaldo(key: string) {
    const rev = transactions.filter(t => t.type === 'revenue' && txKey(t.date) === key).reduce((s, t) => s + t.amount, 0)
    const cost = transactions.filter(t => (t.type === 'cost' || t.type === 'rimborso') && txKey(t.date) === key).reduce((s, t) => s + t.amount, 0)
    return rev - cost
  }

  const filtered = transactions.filter(t => txKey(t.date) === selectedKey)
  const monthRevenue = filtered.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const monthCosts = filtered.filter(t => t.type === 'cost' || t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
  const monthSaldoVal = monthRevenue - monthCosts

  function openAdd() {
    setModalData({ ...EMPTY_FORM, date: `${selectedKey}-01` })
  }

  function openEdit(tx: Transaction) {
    setModalData({
      id: tx.id,
      type: tx.type === 'rimborso' ? 'cost' : tx.type,
      isRimborso: tx.type === 'rimborso',
      date: tx.date,
      amount: tx.amount.toString(),
      description: tx.description,
      category_id: tx.category_id ?? '',
      note: tx.note ?? '',
      receipt_url: tx.receipt_url ?? '',
    })
  }

  function handleSaved(tx: Transaction) {
    setTransactions(prev => {
      const exists = prev.find(t => t.id === tx.id)
      return exists
        ? prev.map(t => t.id === tx.id ? tx : t)
        : [tx, ...prev]
    })
    setModalData(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('transactions').delete().eq('id', deleteId)
    setTransactions(prev => prev.filter(t => t.id !== deleteId))
    setDeleteId(null)
    setDeleting(false)
  }

  function catName(id: string | null) {
    if (!id) return '—'
    return categories.find(c => c.id === id)?.name ?? '—'
  }

  const selectedIdx = months.findIndex(m => m.key === selectedKey)

  if (loading) return <p className="text-sm text-ink-500 py-8">Caricamento...</p>

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-line bg-white px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 font-medium mb-1">Totale Entrate</p>
          <p className="text-xl font-bold text-green-700">{fmtAmt(totalRevenue)}</p>
        </div>
        <div className="border border-line bg-white px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-ink-400 font-medium mb-1">Totale Uscite</p>
          <p className="text-xl font-bold text-red-700">{fmtAmt(totalCosts)}</p>
        </div>
        <div className="px-5 py-4" style={{ backgroundColor: 'var(--forest)' }}>
          <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>Cash Balance</p>
          <p className="text-xl font-bold text-white">{fmtAmt(balance)}</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedIdx > 0 && setSelectedKey(months[selectedIdx - 1].key)}
            disabled={selectedIdx === 0}
            className="flex-shrink-0 p-1.5 border border-line text-ink-400 hover:text-ink-900 hover:border-forest transition-colors disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div ref={pillsRef} className="flex gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
            {months.map(m => {
              const saldo = monthSaldo(m.key)
              const isActive = m.key === selectedKey
              return (
                <button
                  key={m.key}
                  onClick={() => setSelectedKey(m.key)}
                  className="flex-shrink-0 flex flex-col items-center px-3 py-2 border text-xs font-medium transition-colors"
                  style={isActive
                    ? { backgroundColor: 'var(--forest)', borderColor: 'var(--forest)', color: 'white' }
                    : { backgroundColor: 'white', borderColor: '#e5e5e5', color: '#4a4a4a' }
                  }
                >
                  <span className="whitespace-nowrap">{m.label}</span>
                  <span className={`text-[10px] mt-0.5 font-semibold ${isActive ? 'text-white/80' : saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {saldo >= 0 ? '+' : ''}{fmtAmt(saldo)}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            onClick={() => selectedIdx < months.length - 1 && setSelectedKey(months[selectedIdx + 1].key)}
            disabled={selectedIdx === months.length - 1}
            className="flex-shrink-0 p-1.5 border border-line text-ink-400 hover:text-ink-900 hover:border-forest transition-colors disabled:opacity-30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Table header + add button */}
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-ink-500 font-medium">
          {months.find(m => m.key === selectedKey)?.label} — {filtered.length} movimenti
        </p>
        <button
          onClick={openAdd}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-widest px-5 py-2.5 transition-colors"
        >
          + Aggiungi
        </button>
      </div>

      {/* Transaction table */}
      <div className="border border-line overflow-x-auto">
        <table className="w-full text-sm font-['Inter'] border-collapse">
          <thead>
            <tr className="border-b border-line bg-[#f9f9f9]">
              {['DATA', 'DESCRIZIONE', 'CATEGORIA', 'TIPO', 'IMPORTO', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-500 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-ink-400 text-sm py-10">
                  Nessuna transazione per questo mese.
                </td>
              </tr>
            ) : (
              filtered.map(tx => (
                <tr key={tx.id} className={`border-b border-black/5 last:border-0 hover:brightness-95 transition-all ${rowBg(tx.type)}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-ink-500 text-xs">{fmtDate(tx.date)}</td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <DescriptionCell description={tx.description} note={tx.note} />
                  </td>
                  <td className="px-4 py-3 text-ink-500 text-xs whitespace-nowrap">{catName(tx.category_id)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{typeBadge(tx.type)}</td>
                  <td className={`px-4 py-3 font-semibold whitespace-nowrap tabular-nums ${
                    tx.type === 'revenue' ? 'text-green-700' : tx.type === 'rimborso' ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {tx.type === 'revenue' ? '+' : '-'}{fmtAmt(tx.amount)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {tx.receipt_url && (
                        <a
                          href={tx.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-ink-400 hover:text-forest transition-colors"
                          title="Apri ricevuta"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </a>
                      )}
                      <button
                        onClick={() => openEdit(tx)}
                        className="p-1.5 text-ink-400 hover:text-forest transition-colors"
                        title="Modifica"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(tx.id)}
                        className="p-1.5 text-ink-400 hover:text-red-500 transition-colors"
                        title="Elimina"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-forest/20 bg-[#f9f9f9]">
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Saldo mese
                </td>
                <td className={`px-4 py-3 font-bold tabular-nums ${monthSaldoVal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {monthSaldoVal >= 0 ? '+' : ''}{fmtAmt(monthSaldoVal)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modalData && (
        <TxModal
          initial={modalData}
          categories={categories}
          onSave={handleSaved}
          onClose={() => setModalData(null)}
        />
      )}

      {deleteId && (
        <DeleteModal
          onConfirm={handleDelete}
          onClose={() => setDeleteId(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
