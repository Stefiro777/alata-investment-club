'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

// ── Types ──────────────────────────────────────────────────────────────────────

type Variant = {
  id: string
  color: string
  color_hex: string | null
  images: string[] | null
  sort_order: number
}

type Product = {
  id: string
  slug: string
  name: string
  price_cents: number
  description: string | null
  sizes: string[] | null
  visible: boolean
  created_at: string
  product_variants: Variant[]
}

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ── Auth helpers ───────────────────────────────────────────────────────────────

const supabase = createClient()

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

async function apiFetch(method: string, path: string, body?: unknown) {
  const token = await getToken()
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
  const r = await fetch(path, opts)
  return r.json()
}

// ── VisibilityToggle ───────────────────────────────────────────────────────────

function VisibilityToggle() {
  const [visible, setVisible] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getToken().then(token =>
      fetch('/api/admin/merch/visibility', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (typeof d.visible === 'boolean') setVisible(d.visible) })
    )
  }, [])

  async function toggle() {
    if (visible === null) return
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/admin/merch/visibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ visible: !visible }),
    }).then(r => r.json())
    if (res.ok) setVisible(v => !v)
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-4 p-4 border border-black mb-6">
      <div>
        <p className="text-sm font-semibold text-black">Merch page visibility</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {visible === null ? '…' : visible ? '/merch is public' : 'Showing "Coming Soon" screen'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={saving || visible === null}
        className={`ml-auto px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 ${
          visible
            ? 'bg-[#1a4a3a] text-white hover:bg-[#143d30]'
            : 'bg-black text-white hover:bg-gray-800'
        }`}
      >
        {saving ? '…' : visible ? 'Published' : 'Hidden'}
      </button>
    </div>
  )
}

// ── VariantEditor ──────────────────────────────────────────────────────────────

function VariantEditor({
  productId,
  variants,
  onRefresh,
}: {
  productId: string
  variants: Variant[]
  onRefresh: () => void
}) {
  const [color, setColor] = useState('')
  const [colorHex, setColorHex] = useState('#000000')
  const [adding, setAdding] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function addVariant() {
    if (!color.trim()) return
    setAdding(true)
    await apiFetch('POST', '/api/admin/merch/variants', {
      product_id: productId,
      color: color.trim(),
      color_hex: colorHex,
      images: [],
      sort_order: variants.length,
    })
    setColor('')
    setColorHex('#000000')
    setAdding(false)
    onRefresh()
  }

  async function deleteVariant(id: string) {
    await apiFetch('DELETE', `/api/admin/merch/variants?id=${id}`)
    setConfirmDelete(null)
    onRefresh()
  }

  async function uploadImage(variantId: string, file: File) {
    const token = await getToken()
    const form = new FormData()
    form.append('image', file)
    setUploading(variantId)
    const res = await fetch('/api/admin/merch/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(r => r.json())
    if (res.url) {
      const variant = variants.find(v => v.id === variantId)
      const current = variant?.images ?? []
      if (current.length >= 5) { setUploading(null); return }
      await apiFetch('PATCH', '/api/admin/merch/variants', {
        id: variantId,
        images: [...current, res.url],
      })
      onRefresh()
    }
    setUploading(null)
  }

  async function removeImage(variant: Variant, imgUrl: string) {
    await apiFetch('PATCH', '/api/admin/merch/variants', {
      id: variant.id,
      images: (variant.images ?? []).filter(i => i !== imgUrl),
    })
    onRefresh()
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 mb-3">
        Colour Variants
      </p>

      <div className="space-y-2">
        {variants.map(v => (
          <div key={v.id} className="border border-gray-200">
            {/* Variant row */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span
                className="w-5 h-5 border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: v.color_hex ?? '#ccc' }}
              />
              <span className="text-sm font-medium text-black flex-1">{v.color}</span>
              <span className="text-[10px] text-gray-400">{(v.images ?? []).length}/5 images</span>
              <button
                onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                className="text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] hover:underline"
              >
                {expandedId === v.id ? 'Close' : 'Images'}
              </button>
              <button
                onClick={() => setConfirmDelete(v.id)}
                className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            {/* Confirm delete inline */}
            {confirmDelete === v.id && (
              <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-3">
                <span className="text-xs text-red-700 flex-1">Remove variant "{v.color}"?</span>
                <button
                  onClick={() => deleteVariant(v.id)}
                  className="text-xs font-semibold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 px-3 py-1"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Image manager */}
            {expandedId === v.id && (
              <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                <div className="flex gap-2 flex-wrap mb-3">
                  {(v.images ?? []).map((img, i) => (
                    <div key={i} className="relative w-16 h-16 bg-gray-100 group">
                      <Image src={img} alt="" fill className="object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 uppercase tracking-wide">
                          Main
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(v, img)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-600 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(v.images ?? []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No images yet.</p>
                  )}
                </div>
                {(v.images ?? []).length < 5 && (
                  <label className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] cursor-pointer hover:underline">
                    {uploading === v.id ? 'Uploading…' : '+ Add image'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading === v.id}
                      onChange={e => {
                        const f = e.target.files?.[0]
                        if (f) uploadImage(v.id, f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add variant row */}
      <div className="flex gap-2 mt-3 items-center">
        <input
          value={color}
          onChange={e => setColor(e.target.value)}
          placeholder="Colour name"
          className="flex-1 text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
        />
        <input
          type="color"
          value={colorHex}
          onChange={e => setColorHex(e.target.value)}
          title="Pick colour"
          className="w-10 h-10 border border-black cursor-pointer p-0.5 flex-shrink-0"
        />
        <button
          onClick={addVariant}
          disabled={!color.trim() || adding}
          className="px-4 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40"
        >
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── ProductRow ─────────────────────────────────────────────────────────────────

function ProductRow({ product, onRefresh }: { product: Product; onRefresh: () => void }) {
  const [open, setOpen] = useState(false)

  // edit state
  const [name, setName] = useState(product.name)
  const [desc, setDesc] = useState(product.description ?? '')
  const [priceEur, setPriceEur] = useState((product.price_cents / 100).toFixed(2))
  const [sizes, setSizes] = useState<string[]>(product.sizes ?? [])
  const [visible, setVisible] = useState(product.visible)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  function toggleSize(s: string) {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function save() {
    setSaving(true)
    await apiFetch('PATCH', '/api/admin/merch/products', {
      id: product.id,
      name: name.trim(),
      description: desc.trim() || null,
      price_cents: Math.round(parseFloat(priceEur || '0') * 100),
      sizes: sizes.length ? sizes : null,
      visible,
    })
    setSaving(false)
    onRefresh()
  }

  async function del() {
    setDeleting(true)
    await apiFetch('DELETE', `/api/admin/merch/products?id=${product.id}`)
    onRefresh()
  }

  const firstImg = product.product_variants[0]?.images?.[0] ?? null

  return (
    <div className="border border-gray-200">
      {/* Collapsed row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 bg-gray-100 flex-shrink-0 relative overflow-hidden">
          {firstImg && <Image src={firstImg} alt="" fill className="object-cover" />}
        </div>

        {/* Name + slug */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black truncate">{product.name}</p>
          <p className="text-[10px] text-gray-400 truncate">/{product.slug}</p>
        </div>

        {/* Price */}
        <span className="text-sm text-gray-700 flex-shrink-0 hidden sm:block">
          {fmtEur(product.price_cents)}
        </span>

        {/* Badge */}
        <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 flex-shrink-0 ${
          product.visible ? 'bg-[#1a4a3a] text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {product.visible ? 'Active' : 'Hidden'}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-gray-100 px-4 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Price (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={priceEur}
                onChange={e => setPriceEur(e.target.value)}
                className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Description</label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] resize-none"
              />
            </div>

            {/* Sizes */}
            <div className="sm:col-span-2">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-2">Sizes</label>
              <div className="flex gap-2 flex-wrap">
                {ALL_SIZES.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest border transition-colors ${
                      sizes.includes(s)
                        ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-black'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Visible toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                className={`relative w-10 h-5 transition-colors flex-shrink-0 ${visible ? 'bg-[#1a4a3a]' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${visible ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-gray-700">{visible ? 'Visible on /merch' : 'Hidden'}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={save}
              disabled={saving}
              className="px-5 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            {confirmDel ? (
              <>
                <span className="text-xs text-red-600">Delete "{product.name}"?</span>
                <button
                  onClick={del}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-red-700 disabled:opacity-40"
                >
                  {deleting ? '…' : 'Confirm delete'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700"
              >
                Delete product
              </button>
            )}
          </div>

          {/* Variant editor */}
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

// ── AddProductModal ────────────────────────────────────────────────────────────

function AddProductModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [desc, setDesc] = useState('')
  const [priceEur, setPriceEur] = useState('')
  const [sizes, setSizes] = useState<string[]>(['XS', 'S', 'M', 'L', 'XL'])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function handleNameChange(v: string) {
    setName(v)
    if (!slugTouched) setSlug(slugify(v))
  }

  function toggleSize(s: string) {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!name.trim() || !slug.trim()) { setErr('Name and slug are required.'); return }
    setSaving(true)
    const res = await apiFetch('POST', '/api/admin/merch/products', {
      name: name.trim(),
      slug: slug.trim(),
      price_cents: Math.round(parseFloat(priceEur || '0') * 100),
      description: desc.trim() || null,
      sizes: sizes.length ? sizes : null,
      visible: true,
    })
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onRefresh()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <p className="text-sm font-semibold uppercase tracking-widest text-black">New Product</p>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          {err && <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">{err}</p>}

          {/* Name + Slug */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Name *</label>
              <input
                value={name}
                onChange={e => handleNameChange(e.target.value)}
                required
                className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Slug *</label>
              <input
                value={slug}
                onChange={e => { setSlugTouched(true); setSlug(e.target.value) }}
                required
                className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] font-mono"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Price (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="25.00"
              value={priceEur}
              onChange={e => setPriceEur(e.target.value)}
              className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Description</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              className="mt-1 w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] resize-none"
            />
          </div>

          {/* Sizes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-2">Sizes</label>
            <div className="flex gap-2 flex-wrap">
              {ALL_SIZES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-widest border transition-colors ${
                    sizes.includes(s)
                      ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-black'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40"
            >
              {saving ? 'Creating…' : 'Create product'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-[10px] font-semibold uppercase tracking-widest text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── UpsellSection ─────────────────────────────────────────────────────────────

type UpsellItem = {
  id: string
  type: 'product' | 'event'
  reference_id: string
  label: string | null
  priority: number
  active: boolean
  resolvedName: string
  resolvedPrice: number | null
  resolvedDate: string | null
}

function UpsellSection() {
  const [open,     setOpen]     = useState(false)
  const [items,    setItems]    = useState<UpsellItem[]>([])
  const [loading,  setLoading]  = useState(false)
  const [showAdd,  setShowAdd]  = useState(false)

  // products + events for dropdown
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])
  const [events,   setEvents]   = useState<{ id: string; title: string; date: string }[]>([])

  // add form
  const [addType,   setAddType]   = useState<'product' | 'event'>('product')
  const [addRef,    setAddRef]    = useState('')
  const [addLabel,  setAddLabel]  = useState('')
  const [addPriority, setAddPriority] = useState('0')
  const [addSaving, setAddSaving] = useState(false)
  const [addErr,    setAddErr]    = useState('')

  async function loadUpsell() {
    setLoading(true)
    const data = await apiFetch('GET', '/api/admin/merch/upsell')
    setItems(data.items ?? [])
    setLoading(false)
  }

  async function loadDropdowns() {
    const [pData, eData] = await Promise.all([
      apiFetch('GET', '/api/admin/merch/products'),
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
  }, [open])

  async function toggleActive(item: UpsellItem) {
    await apiFetch('PATCH', '/api/admin/merch/upsell', { id: item.id, active: !item.active })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
  }

  async function deleteItem(id: string) {
    await apiFetch('DELETE', `/api/admin/merch/upsell?id=${id}`)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddErr('')
    if (!addRef) { setAddErr('Please select a product or event.'); return }
    setAddSaving(true)
    const res = await apiFetch('POST', '/api/admin/merch/upsell', {
      type:         addType,
      reference_id: addRef,
      label:        addLabel.trim() || null,
      priority:     parseInt(addPriority, 10) || 0,
    })
    setAddSaving(false)
    if (res.error) { setAddErr(res.error); return }
    setShowAdd(false)
    setAddRef(''); setAddLabel(''); setAddPriority('0')
    loadUpsell()
  }

  const dropdownItems = addType === 'product' ? products : events.map(e => ({
    id: e.id, name: `${e.title} (${e.date})`,
  }))

  return (
    <div className="mt-10 border-t border-gray-200 pt-8">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left group"
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1a4a3a] mb-1">
            Checkout Upsell
          </p>
          <h2 className="font-serif text-xl font-bold text-black">Upsell Suggestions</h2>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-6">
          <p className="text-xs text-gray-500 mb-4">
            Up to 3 active items are shown to customers during checkout. Ordered by Priority (highest first).
          </p>

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-2 mb-4">
              {items.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200">
                  No upsell items yet.
                </p>
              )}
              {items.map(item => (
                <div key={item.id} className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 ${
                    item.type === 'product' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {item.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-black truncate">{item.resolvedName}</p>
                    {item.label && (
                      <p className="text-xs text-gray-500 truncate">Label: {item.label}</p>
                    )}
                    <p className="text-[10px] text-gray-400">Priority: {item.priority}</p>
                  </div>
                  <button
                    onClick={() => toggleActive(item)}
                    className={`text-[9px] font-semibold uppercase tracking-widest px-3 py-1.5 border transition-colors ${
                      item.active
                        ? 'bg-[#1a4a3a] text-white border-[#1a4a3a] hover:bg-[#143d30]'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-black'
                    }`}
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700"
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
              className="w-full py-3 border border-dashed border-gray-300 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors"
            >
              + Add Upsell Item
            </button>
          ) : (
            <form onSubmit={submitAdd} className="border border-[#1a4a3a] p-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-black">
                New Upsell Item
              </p>
              {addErr && (
                <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">{addErr}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">Type</label>
                  <select
                    value={addType}
                    onChange={e => { setAddType(e.target.value as 'product' | 'event'); setAddRef('') }}
                    className="w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
                  >
                    <option value="product">Product</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                    {addType === 'product' ? 'Product' : 'Event'} *
                  </label>
                  <select
                    value={addRef}
                    onChange={e => setAddRef(e.target.value)}
                    className="w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
                    required
                  >
                    <option value="">Select…</option>
                    {dropdownItems.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                    Label (optional)
                  </label>
                  <input
                    value={addLabel}
                    onChange={e => setAddLabel(e.target.value)}
                    placeholder="e.g. Don't miss this"
                    className="w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block mb-1">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={addPriority}
                    onChange={e => setAddPriority(e.target.value)}
                    className="w-full text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addSaving}
                  className="px-6 py-2.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40"
                >
                  {addSaving ? 'Saving…' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddErr('') }}
                  className="px-4 py-2.5 border border-gray-300 text-[10px] font-semibold uppercase tracking-widest text-gray-600 hover:bg-gray-50"
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function MerchManagementPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/dashboard'); return }

      const { data: m } = await supabase
        .from('club_members')
        .select('role, teams')
        .eq('email', user.email ?? '')
        .maybeSingle()

      const allowed =
        m?.role === 'bod' ||
        m?.role === 'director' ||
        user.email === 'finullistefano@gmail.com'

      if (!allowed) { router.push('/dashboard'); return }
      setReady(true)
    }
    boot()
  }, [router])

  async function load() {
    setLoading(true)
    const data = await apiFetch('GET', '/api/admin/merch/products')
    setProducts(data.products ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (ready) load()
  }, [ready])

  if (!ready) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#1a4a3a] mb-1">
            Media Team
          </p>
          <h1 className="font-serif text-3xl font-bold text-black">Merch Management</h1>
          <div className="w-8 h-px bg-[#1a4a3a] mt-3" />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-5 py-2.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors flex-shrink-0"
        >
          + Add Product
        </button>
      </div>

      {/* Visibility toggle */}
      <VisibilityToggle />

      {/* Product list */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8">Loading products…</p>
      ) : products.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200">
          <p className="text-sm font-semibold text-gray-600 mb-1">No products yet.</p>
          <p className="text-xs text-gray-400">Click "Add Product" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map(p => (
            <ProductRow key={p.id} product={p} onRefresh={load} />
          ))}
        </div>
      )}

      {/* Upsell management */}
      <UpsellSection />

      {/* Add product modal */}
      {showAdd && (
        <AddProductModal onClose={() => setShowAdd(false)} onRefresh={load} />
      )}
    </div>
  )
}
