'use client'

import { useState, useEffect } from 'react'
import { inputCls, labelCls, btnPrimary, btnGhost, TrashIcon, ConfirmDelete } from './ui'

type CartSuggestionType = 'career_service' | 'merch_product'

type CartSuggestionRow = {
  id: string
  type: CartSuggestionType
  reference_id: string | null
  label: string
  description: string | null
  visible: boolean
  sort_order: number
}

const TYPE_LABEL: Record<CartSuggestionType, string> = {
  career_service: 'Career session (mentor automatico)',
  merch_product: 'Prodotto Merch',
}

/**
 * Cart suggestions shown while booking. A "Career session" suggestion has no
 * reference: at read time it becomes an active mentor with a free slot (rotating),
 * priced at the single session price, and is hidden when no mentor qualifies.
 */
export default function SuggestionsTab() {
  const [rows, setRows]               = useState<CartSuggestionRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [confirmDel, setConfirmDel]   = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [saving, setSaving]           = useState(false)

  const [newType, setNewType]         = useState<CartSuggestionType>('career_service')
  const [newRef, setNewRef]           = useState('')
  const [newLabel, setNewLabel]       = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [newOrder, setNewOrder]       = useState('0')

  async function getToken() {
    const { createClient } = await import('@/lib/supabase')
    const { data: { session } } = await createClient().auth.getSession()
    return session?.access_token ?? null
  }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/cart-suggestions/manage')
    const json = await res.json()
    setRows((json.suggestions ?? []) as CartSuggestionRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleVisible(row: CartSuggestionRow) {
    const token = await getToken()
    await fetch('/api/cart-suggestions/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id: row.id, visible: !row.visible }),
    })
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, visible: !r.visible } : r))
  }

  async function updateOrder(row: CartSuggestionRow, value: string) {
    const order = parseInt(value, 10)
    if (isNaN(order)) return
    const token = await getToken()
    await fetch('/api/cart-suggestions/manage', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ id: row.id, sort_order: order }),
    })
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, sort_order: order } : r))
  }

  async function deleteSuggestion(id: string) {
    setDeleting(true)
    const token = await getToken()
    await fetch(`/api/cart-suggestions/manage?id=${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    setRows(prev => prev.filter(r => r.id !== id))
    setConfirmDel(null)
    setDeleting(false)
  }

  async function addSuggestion() {
    if (newType === 'merch_product' && (!newRef.trim() || !newLabel.trim())) { setError('Riferimento e label obbligatori'); return }
    setSaving(true); setError(null)
    const token = await getToken()
    const res = await fetch('/api/cart-suggestions/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        type: newType,
        reference_id: newType === 'merch_product' ? newRef.trim() : undefined,
        // The title shown to visitors is generated ("Career session con <mentor>"); this is an internal name.
        label: newLabel.trim() || 'Career session',
        description: newDesc.trim() || null,
        sort_order: parseInt(newOrder, 10) || 0,
      }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Insert failed'); setSaving(false); return }
    setRows(prev => [...prev, json.suggestion as CartSuggestionRow])
    setNewLabel(''); setNewDesc(''); setNewOrder('0'); setNewRef('')
    setShowForm(false); setSaving(false)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        Max 3 suggerimenti vengono mostrati nel carrello (ordinati per sort_order). Una Career session
        propone un mentor attivo con uno slot libero, a rotazione, al prezzo unico delle sessioni (gratis per i
        membri attivi); se nessun mentor ha slot liberi non viene mostrata.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400 mb-6">Caricamento…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-5 border border-dashed border-gray-200 text-center mb-6">
          Nessun suggerimento ancora.
        </p>
      ) : (
        <div className="border border-gray-200 mb-6">
          {rows.map((row, i) => (
            <div key={row.id}
              className={`flex items-center gap-4 px-5 py-3 bg-white ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{row.label}</p>
                {row.description && <p className="text-xs text-gray-400 truncate">{row.description}</p>}
                <p className="text-[10px] uppercase tracking-widest text-gray-300 mt-0.5">{TYPE_LABEL[row.type] ?? row.type}</p>
              </div>
              <input
                type="number"
                defaultValue={row.sort_order}
                onBlur={e => updateOrder(row, e.target.value)}
                className="w-16 border border-gray-200 px-2 py-1 text-xs text-center focus:outline-none focus:border-forest"
                title="Sort order"
              />
              <button
                onClick={() => toggleVisible(row)}
                className={`text-xs font-semibold uppercase tracking-widest px-3 py-1 border transition-colors ${
                  row.visible
                    ? 'bg-forest text-white border-forest'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                {row.visible ? 'Visibile' : 'Nascosto'}
              </button>
              {confirmDel === row.id ? (
                <ConfirmDelete
                  onConfirm={() => deleteSuggestion(row.id)}
                  onCancel={() => setConfirmDel(null)}
                  busy={deleting}
                />
              ) : (
                <button onClick={() => setConfirmDel(row.id)} title="Elimina"
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                  <TrashIcon />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="border border-forest/30 bg-[#f9f9f8] px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-forest mb-4">Nuovo Suggerimento</p>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelCls}>Tipo *</label>
              <div className="relative">
                <select value={newType} onChange={e => { setNewType(e.target.value as CartSuggestionType); setNewRef('') }}
                  className={`${inputCls} appearance-none pr-8`}>
                  <option value="career_service">Career session (mentor automatico)</option>
                  <option value="merch_product">Prodotto Merch</option>
                </select>
                <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {newType === 'merch_product' && (
              <div>
                <label className={labelCls}>Riferimento *</label>
                <input value={newRef} onChange={e => setNewRef(e.target.value)}
                  placeholder="UUID prodotto" className={inputCls} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className={labelCls}>
                {newType === 'career_service' ? 'Nome interno (il titolo mostrato è "Career session con <mentor>")' : 'Label (override titolo) *'}
              </label>
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder={newType === 'career_service' ? 'Es. Career session' : 'Es. Felpa Alata'} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>
                Descrizione breve{newType === 'career_service' ? ' (vuota: mostra il prossimo slot libero)' : ''}
              </label>
              <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)}
                placeholder="Breve copy promozionale…" className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Sort order</label>
              <input type="number" value={newOrder} onChange={e => setNewOrder(e.target.value)}
                className={inputCls} />
            </div>
          </div>
          {error && <p className="mb-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
          <div className="flex gap-3">
            <button onClick={addSuggestion}
              disabled={saving || (newType === 'merch_product' && (!newLabel.trim() || !newRef.trim()))}
              className={btnPrimary}>
              {saving ? 'Salvataggio…' : 'Aggiungi'}
            </button>
            <button onClick={() => { setShowForm(false); setError(null) }} className={btnGhost}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>
          + Aggiungi Suggerimento
        </button>
      )}
    </div>
  )
}
