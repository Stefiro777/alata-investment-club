'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Pill, SegmentedPills } from '@/app/components/member/ui'
import { Dialog, Numbers, SearchField, btnDanger, btnGhost, errorCls, fieldCls, labelCls } from './crm/ui'
import {
  type TxForm, type TxType,
  buildTxPayload, canRefund, categoriesFor, effectiveType, emptyTxForm, isOutflow, monthKey, refundBody, refundedIds, totals, txToForm,
} from '@/lib/finance-view'

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
  // Stripe payments: amount is NET (gross - fee); gross/fee are stored separately.
  gross_amount?: number | null
  stripe_fee?: number | null
  stripe_payment_intent_id?: string | null
  stripe_refund_id?: string | null
  refund_of?: string | null
  source_type?: 'membership' | 'event' | 'merch' | 'career' | null
}

type BudgetCategory = { id: string; name: string; type: string }

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getLast24Months(): { label: string; key: string }[] {
  const result = []
  const now = new Date()
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    })
  }
  return result
}

const fmtAmt = (n: number) => `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${fmtAmt(Math.abs(n))}`
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

const textAction = 'rd-italic text-[20px] hover:underline underline-offset-[0.18em] disabled:opacity-40'
const dangerAction = `${textAction} text-[#8a2a1d]`
const TYPE_LABEL: Record<TxType, string> = { revenue: 'Revenue', cost: 'Cost', rimborso: 'Refund' }

// ── The form: add and edit ────────────────────────────────────────────────────

function TransactionForm({ initial, id, categories, onCategoryAdded, onSaved, onCancel }: {
  initial: TxForm
  /** Set when editing. */
  id?: string
  categories: BudgetCategory[]
  onCategoryAdded: (c: BudgetCategory) => void
  onSaved: (tx: Transaction) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<TxForm>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof TxForm>(k: K, v: TxForm[K]) {
    setForm(prev => ({ ...prev, [k]: v }))
  }

  const type = effectiveType(form)
  const cats = categoriesFor(categories, type)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/finance/upload', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (json.url) set('receipt_url', json.url)
    else setError(json.error ?? 'Upload failed')
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const { data, error: err } = await createClient()
      .from('budget_categories')
      .insert({ name: newCatName.trim(), type: type === 'revenue' ? 'revenue' : 'cost' })
      .select('*')
      .single()
    if (!err && data) {
      const cat = data as BudgetCategory
      onCategoryAdded(cat)
      set('category_id', cat.id)
      setNewCatName('')
    }
    setAddingCat(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = buildTxPayload(form)
    if (!payload) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = id
      ? await supabase.from('transactions').update(payload).eq('id', id).select('*').single()
      : await supabase.from('transactions').insert(payload).select('*').single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSaved(data as Transaction)
  }

  return (
    <form onSubmit={submit} className="border-y border-night/20 py-5">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        <div>
          <div className={`${labelCls} mb-2`}>Type</div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedPills
              size="sm"
              label="Type"
              options={[{ value: 'revenue', label: 'Revenue' }, { value: 'cost', label: 'Cost' }]}
              value={form.type}
              onChange={v => setForm(prev => ({ ...prev, type: v, isRimborso: v === 'cost' ? prev.isRimborso : false }))}
            />
            {form.type === 'cost' && (
              <Pill size="sm" active={form.isRimborso} onClick={() => set('isRimborso', !form.isRimborso)}>Refund</Pill>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6">
          <label className="block">
            <span className={labelCls}>Date *</span>
            <input type="date" required value={form.date} onChange={e => set('date', e.target.value)} className={fieldCls} />
          </label>
          <label className="block">
            <span className={labelCls}>Amount (€) *</span>
            <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0.00" className={fieldCls} />
          </label>
        </div>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Description *</span>
          <input required value={form.description} onChange={e => set('description', e.target.value)} placeholder="What it was" className={fieldCls} />
        </label>

        <div>
          <label className="block">
            <span className={labelCls}>Category</span>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)} className={`${fieldCls} cursor-pointer`}>
              <option value="">None</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="mt-3 flex items-end gap-4">
            <input
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
              placeholder="New category"
              aria-label="New category"
              className={fieldCls}
            />
            <button type="button" onClick={addCategory} disabled={addingCat || !newCatName.trim()} className={`${textAction} shrink-0 text-club`}>
              {addingCat ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>

        <div>
          <span className={labelCls}>Receipt</span>
          <div className="flex items-end gap-4">
            <input value={form.receipt_url} onChange={e => set('receipt_url', e.target.value)} placeholder="URL, or upload a file" className={fieldCls} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${textAction} shrink-0 text-club`}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          </div>
        </div>

        <label className="block sm:col-span-2">
          <span className={labelCls}>Notes</span>
          <textarea rows={2} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optional notes" className={`${fieldCls} resize-none`} />
        </label>
      </div>

      {error && <p role="alert" className={`${errorCls} mt-5`}>{error}</p>}
      <div className="mt-6 flex items-baseline gap-6">
        <button type="submit" disabled={saving || uploading} className="rd-italic text-[24px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50">
          {saving ? 'Saving…' : id ? 'Save' : 'Add transaction'}
        </button>
        <button type="button" onClick={onCancel} className={textAction}>Cancel</button>
      </div>
    </form>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

type TypeFilter = 'all' | TxType

export default function TransactionManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const months = getLast24Months()
  const [selectedKey, setSelectedKey] = useState(months[months.length - 1].key)
  const pillsRef = useRef<HTMLDivElement>(null)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<TxForm | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [refundTx, setRefundTx] = useState<Transaction | null>(null)
  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  // Payments that already have a refund row; membership payments are never refundable from here.
  const refunded = refundedIds(transactions)

  async function reload() {
    const { data } = await createClient()
      .from('transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    setTransactions((data ?? []) as Transaction[])
  }

  async function handleRefund() {
    if (!refundTx) return
    setRefunding(true)
    setRefundError(null)
    const res = await fetch('/api/finance/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refundBody(refundTx.id)),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setRefundError(json.error ?? 'The refund failed')
      setRefunding(false)
      return
    }
    // The refund adds a new row and flips the payment to "refunded".
    await reload()
    setRefundTx(null)
    setRefunding(false)
  }

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

  // Show the current month (the last pill) on open.
  useEffect(() => {
    if (pillsRef.current) pillsRef.current.scrollLeft = pillsRef.current.scrollWidth
  }, [loading])

  const allTotals = totals(transactions)
  const inMonth = transactions.filter(t => monthKey(t.date) === selectedKey)
  const month = totals(inMonth)

  const q = search.trim().toLowerCase()
  const catName = (id: string | null) => (id ? categories.find(c => c.id === id)?.name ?? null : null)
  const shown = inMonth.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    if (q && !t.description.toLowerCase().includes(q) && !(t.note ?? '').toLowerCase().includes(q) && !(catName(t.category_id) ?? '').toLowerCase().includes(q)) return false
    return true
  })

  const monthSaldo = (key: string) => totals(transactions.filter(t => monthKey(t.date) === key)).balance
  const selectedIdx = months.findIndex(m => m.key === selectedKey)
  const monthLabel = months[selectedIdx]?.label ?? ''

  function saved(tx: Transaction) {
    setTransactions(prev => (prev.some(t => t.id === tx.id) ? prev.map(t => (t.id === tx.id ? tx : t)) : [tx, ...prev]))
    setAdding(null)
    setEditingId(null)
    if (monthKey(tx.date) !== selectedKey && months.some(m => m.key === monthKey(tx.date))) setSelectedKey(monthKey(tx.date))
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    setDeleteError(null)
    const { error } = await createClient().from('transactions').delete().eq('id', deleteId)
    if (error) { setDeleteError(error.message); setDeleting(false); return }
    setTransactions(prev => prev.filter(t => t.id !== deleteId))
    setDeleteId(null)
    setDeleting(false)
  }

  if (loading) return <p className="py-8 text-[13px] text-earth-600">Loading…</p>

  return (
    <div>
      <Numbers items={[
        { value: fmtAmt(month.revenue), label: `Revenue, ${monthLabel}` },
        { value: fmtAmt(month.costs), label: `Costs, ${monthLabel}` },
        { value: fmtSigned(month.balance), label: `Balance, ${monthLabel}` },
        { value: fmtAmt(allTotals.balance), label: 'Cash balance, all time' },
      ]} />

      {/* Month */}
      <div className="mt-9 flex items-center gap-4">
        <button type="button" onClick={() => selectedIdx > 0 && setSelectedKey(months[selectedIdx - 1].key)} disabled={selectedIdx === 0} className={textAction} aria-label="Previous month">Prev</button>
        <div ref={pillsRef} className="flex flex-1 gap-1.5 overflow-x-auto py-1" style={{ scrollbarWidth: 'none' }}>
          {months.map(m => {
            const saldo = monthSaldo(m.key)
            return (
              <Pill key={m.key} size="sm" active={m.key === selectedKey} onClick={() => setSelectedKey(m.key)}>
                {m.label}
                <span className="font-normal normal-case tracking-normal opacity-70">{fmtSigned(saldo)}</span>
              </Pill>
            )
          })}
        </div>
        <button type="button" onClick={() => selectedIdx < months.length - 1 && setSelectedKey(months[selectedIdx + 1].key)} disabled={selectedIdx === months.length - 1} className={textAction} aria-label="Next month">Next</button>
      </div>

      {/* Filters and add */}
      <div className="mt-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <SearchField value={search} onChange={setSearch} placeholder="Description, note, category…" />
          <div>
            <span className={`${labelCls} mb-2`}>Type</span>
            <SegmentedPills
              size="sm"
              label="Type"
              options={[{ value: 'all', label: 'All' }, { value: 'revenue', label: 'Revenue' }, { value: 'cost', label: 'Costs' }, { value: 'rimborso', label: 'Refunds' }]}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          </div>
        </div>
        <Pill solid onClick={() => { setEditingId(null); setAdding(adding ? null : emptyTxForm(`${selectedKey}-01`)) }}>
          {adding ? 'Close form' : 'Add transaction'}
        </Pill>
      </div>

      {adding && (
        <div className="mt-6">
          <TransactionForm
            initial={adding}
            categories={categories}
            onCategoryAdded={c => setCategories(prev => [...prev, c])}
            onSaved={saved}
            onCancel={() => setAdding(null)}
          />
        </div>
      )}

      {/* List */}
      <section className="mt-8">
        <div className="flex items-baseline justify-between gap-4 pb-3">
          <h2 className="rd-italic text-[28px] md:text-[32px]">{monthLabel}</h2>
          <span className="rd-eyebrow text-[10px] text-earth-500">{shown.length === inMonth.length ? `${inMonth.length} entries` : `${shown.length} of ${inMonth.length}`}</span>
        </div>
        <div className="border-t border-night">
          {shown.length === 0 ? (
            <p className="py-8 text-[13px] text-earth-600">No transactions for this view.</p>
          ) : shown.map(tx => {
            if (editingId === tx.id) {
              return (
                <div key={tx.id} className="border-b border-night/20">
                  <TransactionForm
                    initial={txToForm(tx)}
                    id={tx.id}
                    categories={categories}
                    onCategoryAdded={c => setCategories(prev => [...prev, c])}
                    onSaved={saved}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )
            }
            const out = isOutflow(tx)
            const cat = catName(tx.category_id)
            return (
              <div key={tx.id} className="border-b border-night/20 py-3.5">
                <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-x-4">
                  <span className="rd-num font-serif text-[18px] font-medium leading-[1.3]">{fmtDay(tx.date)}</span>
                  <div className="min-w-0">
                    <div className="break-words font-serif text-[20px] font-medium leading-[1.2]">{tx.description}</div>
                    <div className="rd-eyebrow mt-1 text-[10px] text-earth-500">
                      {[TYPE_LABEL[tx.type], cat].filter(Boolean).join(' · ')}
                    </div>
                    {tx.note && <p className="mt-1 whitespace-pre-wrap text-[12px] leading-[1.5] text-earth-600">{tx.note}</p>}
                  </div>
                  <div className="text-right">
                    <div className={`rd-num font-serif text-[22px] font-medium leading-[1.2] ${out ? 'text-[#8a2a1d]' : ''}`}>
                      {out ? '-' : '+'}{fmtAmt(tx.amount)}
                    </div>
                    {tx.gross_amount != null && (
                      <div className="text-[11px] text-earth-600">
                        gross {fmtAmt(Number(tx.gross_amount))}{tx.stripe_fee != null ? ` · fee ${fmtAmt(Number(tx.stripe_fee))}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1">
                  {tx.receipt_url && (
                    <a href={tx.receipt_url} target="_blank" rel="noopener noreferrer" className={textAction}>Receipt</a>
                  )}
                  {refunded.has(tx.id) && <span className="rd-eyebrow text-[10px] text-[#8a2a1d]">Refunded</span>}
                  {canRefund(tx, refunded) && (
                    <button type="button" onClick={() => { setRefundError(null); setRefundTx(tx) }} className={textAction}>Refund</button>
                  )}
                  <button type="button" onClick={() => { setAdding(null); setEditingId(tx.id) }} className={textAction}>Edit</button>
                  {deleteId === tx.id ? (
                    <span className="flex items-baseline gap-4">
                      <span className="text-[12px]">Delete this transaction? It cannot be undone.</span>
                      <button type="button" onClick={handleDelete} disabled={deleting} className={dangerAction}>{deleting ? 'Deleting…' : 'Yes'}</button>
                      <button type="button" onClick={() => { setDeleteId(null); setDeleteError(null) }} className={textAction}>No</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setDeleteId(tx.id)} className={dangerAction}>Delete</button>
                  )}
                </div>
                {deleteId === tx.id && deleteError && <p role="alert" className={`${errorCls} mt-2`}>{deleteError}</p>}
              </div>
            )
          })}
        </div>
        {inMonth.length > 0 && (
          <div className="flex items-baseline justify-between border-b border-night py-3.5">
            <span className="rd-eyebrow text-[10px] text-earth-600">Balance of the month</span>
            <span className={`rd-num font-serif text-[24px] font-medium ${month.balance < 0 ? 'text-[#8a2a1d]' : ''}`}>{fmtSigned(month.balance)}</span>
          </div>
        )}
      </section>

      {refundTx && (
        <Dialog title="Refund this payment?" sub={refundTx.description} busy={refunding} onClose={() => setRefundTx(null)}>
          <p className="text-[13px] leading-[1.6]">
            The customer gets back the gross amount of{' '}
            <span className="font-semibold">{fmtAmt(Number(refundTx.gross_amount ?? refundTx.amount))}</span> on Stripe.
            {refundTx.source_type === 'event' && ' The event registration is marked as refunded and the seat is free again.'}
            {refundTx.source_type === 'merch' && ' The merch order is marked as refunded.'}
            {refundTx.source_type === 'career' && ' The booking is cancelled and the slot is free again.'}
          </p>
          <p className="mt-3 text-[12px] leading-[1.6] text-earth-600">
            Stripe fees are not returned: the books keep a loss equal to the fee. This cannot be undone.
          </p>
          {refundError && <p role="alert" className={`${errorCls} mt-4`}>{refundError}</p>}
          <div className="mt-6 flex justify-end gap-2 border-t border-night/20 pt-4">
            <button type="button" onClick={() => setRefundTx(null)} disabled={refunding} className={btnGhost}>Cancel</button>
            <button type="button" onClick={handleRefund} disabled={refunding} className={btnDanger}>
              {refunding ? 'Refunding…' : 'Confirm refund'}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  )
}
