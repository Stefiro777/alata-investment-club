'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

const supabase = createClient()

// ── Auth helpers (shared) ─────────────────────────────────────────────────────

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Variant = { id: string; color: string; color_hex: string | null; images: string[] | null; sort_order: number }
type TextVar = { id: string; option: string; sort_order: number }
type Product = {
  id: string; slug: string; name: string; price_cents: number; description: string | null
  sizes: string[] | null; details: Record<string, string> | null; visible: boolean; created_at: string
  product_variants: Variant[]
  product_text_variants: TextVar[]
}

function fmtEur(cents: number) { return `€${(cents / 100).toFixed(2).replace('.', ',')}` }

async function authedFetch(method: string, path: string, body?: unknown) {
  const token = await getToken()
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
  return fetch(path, opts).then(r => r.json())
}

async function authedPost(path: string, body: unknown)  { return authedFetch('POST',   path, body) }
async function authedPatch(path: string, body: unknown)  { return authedFetch('PATCH',  path, body) }
async function authedDelete(path: string)                { return authedFetch('DELETE', path) }
async function authedGet(path: string)                   { return authedFetch('GET',    path) }

// ── VisibilityToggle ──────────────────────────────────────────────────────────

function VisibilityToggle() {
  const [visible, setVisible] = useState<boolean | null>(null)
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetch('/api/admin/merch/visibility', {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
        .then(r => r.json())
        .then(d => { if (typeof d.visible === 'boolean') setVisible(d.visible) })
    })
  }, [])

  async function toggle() {
    if (visible === null) return
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/merch/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ visible: !visible }),
      }).then(r => r.json())
      if (res.ok) setVisible(v => !v)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 border border-gray-200 mb-6">
      <div>
        <p className="text-sm font-semibold text-gray-900">Visibilità pagina Merch</p>
        <p className="text-xs text-gray-500">
          {visible === null ? '...' : visible ? 'La pagina /merch è pubblica' : 'Mostra schermata "Coming Soon"'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving || visible === null}
        className={`ml-auto px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
          visible ? 'bg-[#1a4a3a] text-white hover:bg-[#123a2d]' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } disabled:opacity-50`}
      >
        {visible ? 'Pubblica' : 'Nascosta'}
      </button>
    </div>
  )
}

// ── VariantEditor ─────────────────────────────────────────────────────────────

function VariantEditor({ productId, variants, onRefresh }: {
  productId: string
  variants: Variant[]
  onRefresh: () => void
}) {
  const [color,    setColor]    = useState('')
  const [colorHex, setColorHex] = useState('#000000')
  const [adding,   setAdding]   = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)

  async function addVariant() {
    if (!color) return
    setAdding(true)
    await authedPost('/api/admin/merch/variants', { product_id: productId, color, color_hex: colorHex })
    setColor(''); setColorHex('#000000')
    setAdding(false)
    onRefresh()
  }

  async function deleteVariant(id: string) {
    await authedDelete(`/api/admin/merch/variants?id=${id}`)
    onRefresh()
  }

  async function uploadImage(variantId: string, file: File) {
    const { data: { session } } = await supabase.auth.getSession()
    const form = new FormData()
    form.append('image', file)
    setUploading(variantId)
    const res = await fetch('/api/admin/merch/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
      body: form,
    }).then(r => r.json())
    if (res.url) {
      const variant = variants.find(v => v.id === variantId)
      const newImages = [...(variant?.images ?? []), res.url]
      await authedPatch('/api/admin/merch/variants', { id: variantId, images: newImages })
      onRefresh()
    }
    setUploading(null)
  }

  async function removeImage(variant: Variant, imgUrl: string) {
    const newImages = (variant.images ?? []).filter(i => i !== imgUrl)
    await authedPatch('/api/admin/merch/variants', { id: variant.id, images: newImages })
    onRefresh()
  }

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Varianti colore</p>
      <div className="space-y-3">
        {variants.map(v => (
          <div key={v.id} className="border border-gray-100 p-3">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-5 h-5 border border-gray-300" style={{ backgroundColor: v.color_hex ?? '#ccc' }} />
              <span className="text-sm font-semibold text-gray-900">{v.color}</span>
              <button onClick={() => setActiveVariantId(activeVariantId === v.id ? null : v.id)}
                className="text-xs text-[#1a4a3a] underline ml-auto">
                {activeVariantId === v.id ? 'Chiudi' : 'Immagini'}
              </button>
              <button onClick={() => deleteVariant(v.id)}
                className="text-xs text-red-500 hover:text-red-700">Elimina</button>
            </div>
            {activeVariantId === v.id && (
              <div>
                <div className="flex gap-2 flex-wrap mb-2">
                  {(v.images ?? []).map((img, i) => (
                    <div key={i} className="relative w-16 h-16 bg-gray-100">
                      <Image src={img} alt="" fill className="object-cover" />
                      <button onClick={() => removeImage(v, img)}
                        className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
                <label className="text-xs text-[#1a4a3a] cursor-pointer underline">
                  {uploading === v.id ? 'Caricamento...' : '+ Aggiungi immagine'}
                  <input type="file" className="hidden" accept="image/*"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(v.id, f); e.target.value = '' }}
                    disabled={uploading === v.id} />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Add variant */}
      <div className="flex gap-2 mt-3 items-center">
        <input value={color} onChange={e => setColor(e.target.value)}
          placeholder="Nome colore" className="flex-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" />
        <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)}
          className="w-10 h-10 border border-gray-300 cursor-pointer p-0.5" />
        <button onClick={addVariant} disabled={!color || adding}
          className="px-4 py-2 bg-[#1a4a3a] text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 hover:bg-[#123a2d] transition-colors">
          {adding ? '...' : 'Aggiungi'}
        </button>
      </div>
    </div>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({ product, onRefresh }: { product: Product; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [name,     setName]     = useState(product.name)
  const [priceCts, setPriceCts] = useState(String(product.price_cents))
  const [visible,  setVisible]  = useState(product.visible)
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function save() {
    setSaving(true)
    await authedPatch('/api/admin/merch/products', {
      id: product.id, name, price_cents: parseInt(priceCts, 10), visible,
    })
    setSaving(false)
    setEditing(false)
    onRefresh()
  }

  async function del() {
    if (!confirm(`Eliminare "${product.name}"?`)) return
    setDeleting(true)
    await authedDelete(`/api/admin/merch/products?id=${product.id}`)
    onRefresh()
  }

  return (
    <div className="border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        {/* First image */}
        <div className="w-16 h-16 bg-gray-100 flex-shrink-0 overflow-hidden relative">
          {(() => {
            const img = product.product_variants[0]?.images?.[0]
            return img ? <Image src={img} alt={product.name} fill className="object-cover" /> : null
          })()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${product.visible ? 'bg-green-500' : 'bg-gray-300'}`} />
            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
            <p className="text-sm text-gray-500 ml-auto">{fmtEur(product.price_cents)}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">/{product.slug}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setExpanded(e => !e)}
            className="text-xs text-[#1a4a3a] underline">{expanded ? 'Chiudi' : 'Espandi'}</button>
          <button onClick={() => setEditing(e => !e)}
            className="text-xs text-gray-500 underline">Modifica</button>
          <button onClick={del} disabled={deleting}
            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">Elimina</button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Prezzo (centesimi)</label>
            <input type="number" value={priceCts} onChange={e => setPriceCts(e.target.value)}
              className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`vis-${product.id}`} checked={visible} onChange={e => setVisible(e.target.checked)} className="w-4 h-4" />
            <label htmlFor={`vis-${product.id}`} className="text-sm text-gray-700">Visibile</label>
          </div>
          <div className="col-span-2 flex gap-2">
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-[#1a4a3a] text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 hover:bg-[#123a2d] transition-colors">
              {saving ? 'Salvo...' : 'Salva'}
            </button>
            <button onClick={() => setEditing(false)}
              className="px-4 py-2 border border-gray-300 text-xs font-semibold uppercase tracking-widest text-gray-600 hover:bg-gray-50">
              Annulla
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <VariantEditor
            productId={product.id}
            variants={product.product_variants}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  )
}

// ── AddProductForm ────────────────────────────────────────────────────────────

function AddProductForm({ onRefresh }: { onRefresh: () => void }) {
  const [open,    setOpen]    = useState(false)
  const [name,    setName]    = useState('')
  const [slug,    setSlug]    = useState('')
  const [price,   setPrice]   = useState('')
  const [desc,    setDesc]    = useState('')
  const [sizes,   setSizes]   = useState('XS,S,M,L,XL')
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!name || !slug) { setErr('Nome e slug obbligatori'); return }
    setSaving(true)
    const res = await authedPost('/api/admin/merch/products', {
      name, slug,
      price_cents: parseInt(price || '0', 10),
      description: desc || null,
      sizes: sizes ? sizes.split(',').map(s => s.trim()).filter(Boolean) : null,
      visible: true,
    })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    setName(''); setSlug(''); setPrice(''); setDesc(''); setSizes('XS,S,M,L,XL')
    setOpen(false)
    onRefresh()
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full py-3 border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors uppercase tracking-widest font-semibold">
      + Nuovo prodotto
    </button>
  )

  return (
    <form onSubmit={submit} className="border-2 border-[#1a4a3a] p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900 uppercase tracking-widest">Nuovo prodotto</p>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Nome *</label>
          <input value={name} onChange={e => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) }}
            className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Slug *</label>
          <input value={slug} onChange={e => setSlug(e.target.value)}
            className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" required />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Prezzo (centesimi)</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="2500 = €25,00"
            className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Taglie (virgola)</label>
          <input value={sizes} onChange={e => setSizes(e.target.value)} placeholder="XS,S,M,L,XL"
            className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a]" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">Descrizione</label>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
            className="w-full mt-1 text-sm border border-gray-300 px-3 py-2 focus:outline-none focus:border-[#1a4a3a] resize-none" />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="px-6 py-2 bg-[#1a4a3a] text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 hover:bg-[#123a2d] transition-colors">
          {saving ? 'Salvo...' : 'Crea prodotto'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="px-4 py-2 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 uppercase tracking-widest font-semibold">
          Annulla
        </button>
      </div>
    </form>
  )
}

// ── UpsellSection ─────────────────────────────────────────────────────────────

type UpsellItem = {
  id: string; type: 'product' | 'event'; reference_id: string
  label: string | null; priority: number; active: boolean
  resolvedName: string; resolvedPrice: number | null; resolvedDate: string | null
}

function UpsellSection() {
  const [open,        setOpen]        = useState(false)
  const [items,       setItems]       = useState<UpsellItem[]>([])
  const [loading,     setLoading]     = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [products,    setProducts]    = useState<{ id: string; name: string }[]>([])
  const [events,      setEvents]      = useState<{ id: string; title: string; date: string }[]>([])
  const [addType,     setAddType]     = useState<'product' | 'event'>('product')
  const [addRef,      setAddRef]      = useState('')
  const [addLabel,    setAddLabel]    = useState('')
  const [addPriority, setAddPriority] = useState('0')
  const [addSaving,   setAddSaving]   = useState(false)
  const [addErr,      setAddErr]      = useState('')

  async function loadUpsell() {
    setLoading(true)
    const data = await authedGet('/api/admin/merch/upsell')
    setItems(data.items ?? [])
    setLoading(false)
  }

  async function loadDropdowns() {
    const [pData, eData] = await Promise.all([
      authedGet('/api/admin/merch/products'),
      fetch('/api/calendar/events').then(r => r.json()),
    ])
    setProducts((pData.products ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
    const now = new Date().toISOString().slice(0, 10)
    setEvents(
      ((eData.data ?? []) as { id: string; title: string; date: string }[])
        .filter(e => e.date >= now)
        .sort((a, b) => a.date.localeCompare(b.date))
    )
  }

  useEffect(() => {
    if (open && items.length === 0) loadUpsell()
    if (open) loadDropdowns()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function toggleActive(item: UpsellItem) {
    await authedPatch('/api/admin/merch/upsell', { id: item.id, active: !item.active })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
  }

  async function deleteItem(id: string) {
    await authedDelete(`/api/admin/merch/upsell?id=${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddErr('')
    if (!addRef) { setAddErr('Please select a product or event.'); return }
    setAddSaving(true)
    const res = await authedPost('/api/admin/merch/upsell', {
      type: addType, reference_id: addRef,
      label: addLabel.trim() || null, priority: parseInt(addPriority, 10) || 0,
    })
    setAddSaving(false)
    if (res.error) { setAddErr(res.error); return }
    setShowAdd(false); setAddRef(''); setAddLabel(''); setAddPriority('0')
    loadUpsell()
  }

  const dropdownItems = addType === 'product'
    ? products
    : events.map(e => ({ id: e.id, name: `${e.title} (${e.date})` }))

  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <p className="text-sm font-semibold text-gray-900 font-['Inter']">Upsell Suggestions</p>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-3 font-['Inter']">
            Up to 3 active items shown to customers at checkout, ordered by priority.
          </p>

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-2 mb-3">
              {items.length === 0 && (
                <p className="text-sm text-gray-400 py-3 text-center border border-dashed border-gray-200">
                  No upsell items yet.
                </p>
              )}
              {items.map(item => (
                <div key={item.id} className="border border-gray-200 px-3 py-2.5 flex items-center gap-3">
                  <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 flex-shrink-0 ${
                    item.type === 'product' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.resolvedName}</p>
                    {item.label && <p className="text-xs text-gray-500 truncate">"{item.label}"</p>}
                    <p className="text-[10px] text-gray-400">Priority: {item.priority}</p>
                  </div>
                  <button
                    onClick={() => toggleActive(item)}
                    className={`text-[9px] font-semibold uppercase tracking-widest px-3 py-1.5 border transition-colors flex-shrink-0 ${
                      item.active
                        ? 'bg-[#1a4a3a] text-white border-[#1a4a3a] hover:bg-[#123a2d]'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700 flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showAdd ? (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-2.5 border border-dashed border-gray-300 text-xs text-gray-500 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors uppercase tracking-widest font-semibold"
            >
              + Add Upsell Item
            </button>
          ) : (
            <form onSubmit={submitAdd} className="border border-[#1a4a3a] p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-900">New Upsell Item</p>
              {addErr && <p className="text-xs text-red-600">{addErr}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Type</label>
                  <select
                    value={addType}
                    onChange={e => { setAddType(e.target.value as 'product' | 'event'); setAddRef('') }}
                    className="w-full text-sm border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-[#1a4a3a]"
                  >
                    <option value="product">Product</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                    {addType === 'product' ? 'Product' : 'Event'} *
                  </label>
                  <select
                    value={addRef}
                    onChange={e => setAddRef(e.target.value)}
                    className="w-full text-sm border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-[#1a4a3a]"
                    required
                  >
                    <option value="">Select…</option>
                    {dropdownItems.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Label (optional)</label>
                  <input
                    value={addLabel}
                    onChange={e => setAddLabel(e.target.value)}
                    placeholder="e.g. Don't miss this"
                    className="w-full text-sm border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-[#1a4a3a]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Priority</label>
                  <input
                    type="number"
                    value={addPriority}
                    onChange={e => setAddPriority(e.target.value)}
                    className="w-full text-sm border border-gray-300 px-2 py-1.5 focus:outline-none focus:border-[#1a4a3a]"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-4 py-2 bg-[#1a4a3a] text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 hover:bg-[#123a2d] transition-colors"
                >
                  {addSaving ? '…' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddErr('') }}
                  className="px-3 py-2 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50 uppercase tracking-widest font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main MerchManager ─────────────────────────────────────────────────────────

export default function MerchManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)

  async function load() {
    setLoading(true)
    const data = await authedGet('/api/admin/merch/products')
    setProducts(data.products ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-gray-900">Gestione Merch</h2>
        <p className="text-xs text-gray-500 mt-1 font-['Inter']">Prodotti, varianti colore e immagini</p>
      </div>

      <VisibilityToggle />

      <div className="space-y-3 mb-4">
        {loading ? (
          <p className="text-sm text-gray-400">Caricamento...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun prodotto ancora.</p>
        ) : (
          products.map(p => <ProductCard key={p.id} product={p} onRefresh={load} />)
        )}
      </div>

      <AddProductForm onRefresh={load} />

      <UpsellSection />
    </div>
  )
}
