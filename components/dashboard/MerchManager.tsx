'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import Image from 'next/image'

const supabase = createClient()

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

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

// ── Types ─────────────────────────────────────────────────────────────────────

type ShippingRate = { zone: 'IT' | 'EU' | 'WORLD'; price_cents: number }
type DiscountCode = {
  id: string; code: string; type: 'percentage' | 'fixed'; value: number
  max_uses: number | null; uses_count: number; expires_at: string | null; active: boolean
}

type Variant  = { id: string; color: string; color_hex: string | null; images: string[] | null; sort_order: number }
type TextVar  = { id: string; option: string; sort_order: number }
type Product  = {
  id: string; slug: string; name: string; price_cents: number; description: string | null
  sizes: string[] | null; details: Record<string, string> | null; visible: boolean; created_at: string
  product_variants: Variant[]
  product_text_variants: TextVar[]
}

const ZONE_LABELS: Record<string, string> = { IT: 'Italy', EU: 'European Union', WORLD: 'International' }

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function fmtEur(cents: number) { return `€${(cents / 100).toFixed(2).replace('.', ',')}` }
function slugify(s: string)    { return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }

const INPUT_CLS = 'w-full border border-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] bg-white'
const LABEL_CLS = 'block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1'

// ── SizeToggle ────────────────────────────────────────────────────────────────

function SizeToggle({ sizes, onChange }: { sizes: string[]; onChange: (s: string[]) => void }) {
  function toggle(s: string) {
    onChange(sizes.includes(s) ? sizes.filter(x => x !== s) : [...sizes, s])
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {ALL_SIZES.map(s => (
        <button
          key={s}
          type="button"
          onClick={() => toggle(s)}
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
  )
}

// ── VisibilityToggle ──────────────────────────────────────────────────────────

function VisibilityToggle() {
  const [visible, setVisible] = useState<boolean | null>(null)
  const [saving,  setSaving]  = useState(false)

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
          {visible === null ? '…' : visible ? '/merch is public' : '/merch is hidden'}
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

// ── VariantEditor ─────────────────────────────────────────────────────────────

function VariantEditor({ productId, variants, onRefresh }: {
  productId: string
  variants: Variant[]
  onRefresh: () => void
}) {
  const [color,           setColor]          = useState('')
  const [colorHex,        setColorHex]       = useState('#000000')
  const [adding,          setAdding]         = useState(false)
  const [uploading,       setUploading]      = useState<string | null>(null)
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  const [confirmDelete,   setConfirmDelete]  = useState<string | null>(null)
  // Local image state keyed by variantId for immediate UI updates without full reload
  const [localImages, setLocalImages] = useState<Record<string, string[]>>(
    () => Object.fromEntries(variants.map(v => [v.id, v.images ?? []]))
  )

  // Sync local state when parent re-fetches variants
  useEffect(() => {
    setLocalImages(Object.fromEntries(variants.map(v => [v.id, v.images ?? []])))
  }, [variants])

  async function addVariant() {
    if (!color.trim()) return
    setAdding(true)
    await authedPost('/api/admin/merch/variants', {
      product_id: productId, color: color.trim(), color_hex: colorHex,
      images: [], sort_order: variants.length,
    })
    setColor(''); setColorHex('#000000')
    setAdding(false)
    onRefresh()
  }

  async function deleteVariant(id: string) {
    await authedDelete(`/api/admin/merch/variants?id=${id}`)
    setConfirmDelete(null)
    onRefresh()
  }

  async function uploadImage(variantId: string, file: File) {
    const current = localImages[variantId] ?? []
    if (current.length >= 5) return
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
      const updated = [...current, res.url]
      setLocalImages(prev => ({ ...prev, [variantId]: updated }))
      await authedPatch('/api/admin/merch/variants', { id: variantId, images: updated })
    }
    setUploading(null)
  }

  async function removeImage(variantId: string, imgUrl: string) {
    const updated = (localImages[variantId] ?? []).filter(i => i !== imgUrl)
    setLocalImages(prev => ({ ...prev, [variantId]: updated }))
    await authedPatch('/api/admin/merch/variants', { id: variantId, images: updated })
  }

  return (
    <div className="mt-5 pt-5 border-t border-gray-100">
      <p className={`${LABEL_CLS} mb-3`}>Color Variants</p>

      <div className="space-y-2">
        {variants.map(v => {
          const imgs = localImages[v.id] ?? []
          return (
          <div key={v.id} className="border border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <span className="w-5 h-5 border border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: v.color_hex ?? '#ccc' }} />
              <span className="text-sm font-medium text-black flex-1">{v.color}</span>
              <span className="text-[10px] text-gray-400">{imgs.length}/5</span>
              <button
                onClick={() => setActiveVariantId(activeVariantId === v.id ? null : v.id)}
                className="text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] hover:underline"
              >
                {activeVariantId === v.id ? 'Close' : 'Images'}
              </button>
              <button
                onClick={() => setConfirmDelete(v.id)}
                className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>

            {confirmDelete === v.id && (
              <div className="px-3 py-2 bg-red-50 border-t border-red-200 flex items-center gap-3">
                <span className="text-xs text-red-700 flex-1">Remove "{v.color}"?</span>
                <button onClick={() => deleteVariant(v.id)}
                  className="text-xs font-semibold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 px-3 py-1">
                  Confirm
                </button>
                <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:text-gray-800">
                  Cancel
                </button>
              </div>
            )}

            {activeVariantId === v.id && (
              <div className="px-3 pb-4 border-t border-gray-100 pt-3">
                <div className="flex gap-2 flex-wrap mb-3">
                  {imgs.map((img, i) => (
                    <div key={img} className="relative w-20 h-20 bg-gray-100 group flex-shrink-0">
                      <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 uppercase tracking-wide pointer-events-none">
                          Main
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(v.id, img)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-600 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {imgs.length === 0 && (
                    <p className="text-xs text-gray-400 italic self-center">No images yet.</p>
                  )}
                </div>
                {imgs.length < 5 && (
                  <label className={`inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest cursor-pointer hover:underline ${
                    uploading === v.id ? 'text-gray-400 pointer-events-none' : 'text-[#1a4a3a]'
                  }`}>
                    {uploading === v.id ? 'Uploading…' : '+ Add image'}
                    <input type="file" accept="image/*" className="hidden"
                      disabled={uploading === v.id}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(v.id, f); e.target.value = '' }} />
                  </label>
                )}
                {imgs.length >= 5 && (
                  <p className="text-[10px] text-gray-400 italic">Maximum 5 images reached.</p>
                )}
              </div>
            )}
          </div>
          )
        })}
      </div>

      <div className="flex gap-2 mt-3 items-center">
        <input
          value={color} onChange={e => setColor(e.target.value)}
          placeholder="Colour name"
          className="flex-1 text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
        />
        <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)}
          title="Pick colour"
          className="w-10 h-10 border border-black cursor-pointer p-0.5 flex-shrink-0" />
        <button onClick={addVariant} disabled={!color.trim() || adding}
          className="px-4 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40">
          {adding ? '…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── ProductRow ────────────────────────────────────────────────────────────────

function ProductRow({ product, onRefresh }: { product: Product; onRefresh: () => void }) {
  const [open,       setOpen]       = useState(false)
  const [name,       setName]       = useState(product.name)
  const [desc,       setDesc]       = useState(product.description ?? '')
  const [priceEur,   setPriceEur]   = useState((product.price_cents / 100).toFixed(2))
  const [sizes,      setSizes]      = useState<string[]>(product.sizes ?? [])
  const [visible,    setVisible]    = useState(product.visible)
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  async function save() {
    setSaving(true)
    await authedPatch('/api/admin/merch/products', {
      id: product.id, name: name.trim(), description: desc.trim() || null,
      price_cents: Math.round(parseFloat(priceEur || '0') * 100),
      sizes: sizes.length ? sizes : null, visible,
    })
    setSaving(false)
    onRefresh()
  }

  async function del() {
    setDeleting(true)
    await authedDelete(`/api/admin/merch/products?id=${product.id}`)
    onRefresh()
  }

  const firstImg = product.product_variants[0]?.images?.[0] ?? null

  return (
    <div className="border border-gray-200">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="w-12 h-12 bg-gray-100 flex-shrink-0 relative overflow-hidden">
          {firstImg && <Image src={firstImg} alt="" fill className="object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black truncate">{product.name}</p>
          <p className="text-[10px] text-gray-400 truncate">/{product.slug}</p>
        </div>
        <span className="text-sm text-gray-700 flex-shrink-0 hidden sm:block">
          {fmtEur(product.price_cents)}
        </span>
        <span className={`text-[9px] font-semibold uppercase tracking-widest px-2 py-0.5 flex-shrink-0 ${
          product.visible ? 'bg-[#1a4a3a] text-white' : 'bg-gray-200 text-gray-500'
        }`}>
          {product.visible ? 'Active' : 'Hidden'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLS}>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className={LABEL_CLS}>Price (€)</label>
              <input type="number" min="0" step="0.01" value={priceEur}
                onChange={e => setPriceEur(e.target.value)} className={INPUT_CLS} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
                className={`${INPUT_CLS} resize-none`} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL_CLS}>Sizes</label>
              <SizeToggle sizes={sizes} onChange={setSizes} />
            </div>
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

          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100">
            <button onClick={save} disabled={saving}
              className="px-5 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {confirmDel ? (
              <>
                <span className="text-xs text-red-600">Delete "{product.name}"?</span>
                <button onClick={del} disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-red-700 disabled:opacity-40">
                  {deleting ? '…' : 'Confirm'}
                </button>
                <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-500 hover:text-gray-800">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="ml-auto text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700">
                Delete product
              </button>
            )}
          </div>

          <VariantEditor productId={product.id} variants={product.product_variants} onRefresh={onRefresh} />
        </div>
      )}
    </div>
  )
}

// ── AddProductModal ───────────────────────────────────────────────────────────

type DraftVariant = {
  id: string          // local-only key (not a DB id yet)
  color: string
  colorHex: string
  images: string[]    // URLs already uploaded, to be linked after product creation
  uploading: boolean
}

function AddProductModal({ onClose, onRefresh }: { onClose: () => void; onRefresh: () => void }) {
  const [name,     setName]     = useState('')
  const [slug,     setSlug]     = useState('')
  const [desc,     setDesc]     = useState('')
  const [priceEur, setPriceEur] = useState('')
  const [sizes,    setSizes]    = useState<string[]>(['XS', 'S', 'M', 'L', 'XL'])
  const [saving,   setSaving]   = useState(false)
  const [err,      setErr]      = useState('')

  // Draft variants — local state, not saved until "Create product"
  const [draftVariants,    setDraftVariants]    = useState<DraftVariant[]>([])
  const [newColor,         setNewColor]         = useState('')
  const [newColorHex,      setNewColorHex]      = useState('#000000')
  const [addingVariant,    setAddingVariant]     = useState(false)

  function handleNameChange(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  function addDraftVariant() {
    if (!newColor.trim()) return
    setDraftVariants(prev => [
      ...prev,
      { id: crypto.randomUUID(), color: newColor.trim(), colorHex: newColorHex, images: [], uploading: false },
    ])
    setNewColor(''); setNewColorHex('#000000')
    setAddingVariant(false)
  }

  function removeDraftVariant(id: string) {
    setDraftVariants(prev => prev.filter(v => v.id !== id))
  }

  async function uploadDraftImage(variantId: string, file: File) {
    setDraftVariants(prev => prev.map(v => v.id === variantId ? { ...v, uploading: true } : v))
    const token = await getToken()
    const form = new FormData()
    form.append('image', file)
    const res = await fetch('/api/admin/merch/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(r => r.json())
    setDraftVariants(prev => prev.map(v =>
      v.id === variantId
        ? { ...v, uploading: false, images: res.url && v.images.length < 5 ? [...v.images, res.url] : v.images }
        : v
    ))
  }

  function removeDraftImage(variantId: string, imgUrl: string) {
    setDraftVariants(prev => prev.map(v =>
      v.id === variantId ? { ...v, images: v.images.filter(i => i !== imgUrl) } : v
    ))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Name is required.'); return }
    if (draftVariants.length === 0) { setErr('Add at least one colour variant.'); return }
    setSaving(true)

    // 1. Create product
    const productRes = await authedPost('/api/admin/merch/products', {
      name: name.trim(), slug: slug.trim(),
      price_cents: Math.round(parseFloat(priceEur || '0') * 100),
      description: desc.trim() || null,
      sizes: sizes.length ? sizes : null,
      visible: true,
    })
    if (productRes.error) { setErr(productRes.error); setSaving(false); return }

    const productId: string = productRes.product?.id ?? productRes.id
    if (!productId) { setErr('Product created but no ID returned.'); setSaving(false); return }

    // 2. Create each variant (images included in POST body)
    await Promise.all(draftVariants.map(async (v, idx) => {
      await authedPost('/api/admin/merch/variants', {
        product_id: productId, color: v.color, color_hex: v.colorHex,
        images: v.images, sort_order: idx,
      })
    }))

    setSaving(false)
    onRefresh()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-sm font-semibold uppercase tracking-widest text-black">New Product</p>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {err && (
            <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2">{err}</p>
          )}

          <div>
            <label className={LABEL_CLS}>Name *</label>
            <input value={name} onChange={e => handleNameChange(e.target.value)}
              placeholder="e.g. Alata Hoodie" required className={INPUT_CLS} />
          </div>

          <div>
            <label className={LABEL_CLS}>Price (€)</label>
            <input type="number" min="0" step="0.01" placeholder="25.00"
              value={priceEur} onChange={e => setPriceEur(e.target.value)} className={INPUT_CLS} />
          </div>

          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="Describe the product, materials, fit..."
              className={`${INPUT_CLS} resize-none`} />
          </div>

          <div>
            <label className={LABEL_CLS}>Sizes</label>
            <SizeToggle sizes={sizes} onChange={setSizes} />
          </div>

          {/* ── Color Variants ── */}
          <div className="pt-2 border-t border-gray-100">
            <p className={`${LABEL_CLS} mb-3`}>Color Variants *</p>

            {draftVariants.length > 0 && (
              <div className="space-y-3 mb-3">
                {draftVariants.map(v => (
                  <div key={v.id} className="border border-gray-200 p-3">
                    {/* Variant header */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-4 border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: v.colorHex }} />
                      <span className="text-xs font-semibold text-black flex-1">{v.color}</span>
                      <span className="text-[10px] text-gray-400">{v.images.length}/5</span>
                      <button type="button" onClick={() => removeDraftVariant(v.id)}
                        className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700">
                        Remove
                      </button>
                    </div>
                    {/* Thumbnails */}
                    <div className="flex gap-2 flex-wrap">
                      {v.images.map((img, i) => (
                        <div key={img} className="relative w-12 h-12 bg-gray-100 group flex-shrink-0">
                          <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                          {i === 0 && (
                            <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] text-center py-px pointer-events-none">
                              Main
                            </span>
                          )}
                          <button type="button" onClick={() => removeDraftImage(v.id, img)}
                            className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none">
                            ×
                          </button>
                        </div>
                      ))}
                      {v.images.length < 5 && (
                        <label className={`w-12 h-12 border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#1a4a3a] transition-colors flex-shrink-0 ${v.uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          <span className="text-lg text-gray-400 leading-none">{v.uploading ? '…' : '+'}</span>
                          <input type="file" accept="image/*" className="hidden"
                            disabled={v.uploading}
                            onChange={e => { const f = e.target.files?.[0]; if (f) uploadDraftImage(v.id, f); e.target.value = '' }} />
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add variant row */}
            {addingVariant ? (
              <div className="flex gap-2 items-center">
                <input value={newColor} onChange={e => setNewColor(e.target.value)}
                  placeholder="Colour name"
                  className="flex-1 text-sm border border-black px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1a4a3a]"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraftVariant() } }}
                  autoFocus />
                <input type="color" value={newColorHex} onChange={e => setNewColorHex(e.target.value)}
                  className="w-10 h-10 border border-black cursor-pointer p-0.5 flex-shrink-0" />
                <button type="button" onClick={addDraftVariant} disabled={!newColor.trim()}
                  className="px-3 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] disabled:opacity-40 flex-shrink-0">
                  Add
                </button>
                <button type="button" onClick={() => { setAddingVariant(false); setNewColor(''); setNewColorHex('#000000') }}
                  className="text-[10px] text-gray-400 hover:text-gray-700 flex-shrink-0">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAddingVariant(true)}
                className="w-full py-2.5 border border-dashed border-gray-300 text-[10px] font-semibold uppercase tracking-widest text-gray-500 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors">
                + Add colour variant
              </button>
            )}
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40">
              {saving ? 'Creating…' : 'Create product'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-black text-[10px] font-semibold uppercase tracking-widest text-black hover:bg-gray-50">
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
        <p className="text-sm font-semibold text-black">Upsell Suggestions</p>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-3">
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
                    <p className="text-sm font-semibold text-black truncate">{item.resolvedName}</p>
                    {item.label && <p className="text-xs text-gray-500 truncate">"{item.label}"</p>}
                    <p className="text-[10px] text-gray-400">Priority: {item.priority}</p>
                  </div>
                  <button onClick={() => toggleActive(item)}
                    className={`text-[9px] font-semibold uppercase tracking-widest px-3 py-1.5 border transition-colors flex-shrink-0 ${
                      item.active
                        ? 'bg-[#1a4a3a] text-white border-[#1a4a3a] hover:bg-[#143d30]'
                        : 'bg-white text-gray-500 border-gray-300 hover:border-gray-500'
                    }`}>
                    {item.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => deleteItem(item.id)}
                    className="text-[10px] font-semibold uppercase tracking-widest text-red-500 hover:text-red-700 flex-shrink-0">
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showAdd ? (
            <button onClick={() => setShowAdd(true)}
              className="w-full py-2.5 border border-dashed border-gray-300 text-xs text-gray-500 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors uppercase tracking-widest font-semibold">
              + Add Upsell Item
            </button>
          ) : (
            <form onSubmit={submitAdd} className="border border-[#1a4a3a] p-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-black">New Upsell Item</p>
              {addErr && <p className="text-xs text-red-600">{addErr}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL_CLS}>Type</label>
                  <select value={addType}
                    onChange={e => { setAddType(e.target.value as 'product' | 'event'); setAddRef('') }}
                    className={INPUT_CLS}>
                    <option value="product">Product</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>{addType === 'product' ? 'Product' : 'Event'} *</label>
                  <select value={addRef} onChange={e => setAddRef(e.target.value)} required className={INPUT_CLS}>
                    <option value="">Select…</option>
                    {dropdownItems.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Label (optional)</label>
                  <input value={addLabel} onChange={e => setAddLabel(e.target.value)}
                    placeholder="e.g. Don't miss this" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Priority</label>
                  <input type="number" value={addPriority} onChange={e => setAddPriority(e.target.value)}
                    className={INPUT_CLS} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addSaving}
                  className="px-4 py-2 bg-[#1a4a3a] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40">
                  {addSaving ? '…' : 'Add Item'}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setAddErr('') }}
                  className="px-3 py-2 border border-black text-xs text-black hover:bg-gray-50 uppercase tracking-widest font-semibold">
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

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-8 border-t border-gray-200 pt-6">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-left"
      >
        <p className="text-sm font-semibold text-black">{title}</p>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  )
}

// ── ShippingRatesSection ──────────────────────────────────────────────────────

function ShippingRatesSection() {
  const zones: ('IT' | 'EU' | 'WORLD')[] = ['IT', 'EU', 'WORLD']
  const [prices,  setPrices]  = useState<Record<string, string>>({ IT: '0', EU: '0', WORLD: '0' })
  const [loaded,  setLoaded]  = useState(false)
  const [saving,  setSaving]  = useState<Record<string, boolean>>({})
  const [saved,   setSaved]   = useState<Record<string, boolean>>({})
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/shipping-rates').then(r => r.json()).then(d => {
      const m: Record<string, string> = { IT: '0', EU: '0', WORLD: '0' }
      for (const r of (d.rates ?? []) as ShippingRate[]) m[r.zone] = String(r.price_cents)
      setPrices(m)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  async function handleSave(zone: string) {
    setSaving(p => ({ ...p, [zone]: true }))
    setSaved(p => ({ ...p, [zone]: false }))
    setErrors(p => ({ ...p, [zone]: '' }))
    try {
      const res  = await authedPatch('/api/shipping-rates', { zone, price_cents: Number(prices[zone]) })
      if (res.error) throw new Error(res.error)
      setSaved(p => ({ ...p, [zone]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [zone]: false })), 2000)
    } catch (e: unknown) {
      setErrors(p => ({ ...p, [zone]: e instanceof Error ? e.message : 'Error' }))
    } finally {
      setSaving(p => ({ ...p, [zone]: false }))
    }
  }

  return (
    <CollapsibleSection title="Shipping Rates">
      <p className="text-xs text-gray-500 mb-4">
        Prices in euro cents (e.g. 500 = €5,00). Zone is determined by destination country.
      </p>
      {!loaded ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {zones.map(zone => (
            <div key={zone} className="flex items-end gap-3">
              <div className="flex-1">
                <label className={LABEL_CLS}>{ZONE_LABELS[zone]}</label>
                <input
                  type="number" min={0}
                  value={prices[zone]}
                  onChange={e => setPrices(p => ({ ...p, [zone]: e.target.value }))}
                  className={INPUT_CLS}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  {Number(prices[zone]) === 0 ? 'Free' : fmtEur(Number(prices[zone]))}
                </p>
                {errors[zone] && <p className="text-xs text-red-600 mt-1">{errors[zone]}</p>}
              </div>
              <button
                onClick={() => handleSave(zone)}
                disabled={saving[zone]}
                className="mb-6 px-4 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40"
              >
                {saved[zone] ? 'Saved ✓' : saving[zone] ? '…' : 'Save'}
              </button>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  )
}

// ── DiscountCodesSection ──────────────────────────────────────────────────────

function DiscountCodesSection() {
  const [codes,   setCodes]   = useState<DiscountCode[]>([])
  const [loaded,  setLoaded]  = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [addErr,  setAddErr]  = useState('')
  const [form, setForm] = useState({
    code: '', type: 'percentage' as 'percentage' | 'fixed',
    value: '', max_uses: '', expires_at: '',
  })

  function setF(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    authedGet('/api/admin/discount-codes').then(d => {
      setCodes(d.codes ?? [])
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  async function handleAdd() {
    if (!form.code.trim() || !form.value) { setAddErr('Code and value are required.'); return }
    setSaving(true); setAddErr('')
    try {
      const res = await authedPost('/api/admin/discount-codes', {
        code: form.code.trim().toUpperCase(), type: form.type,
        value: Number(form.value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      })
      if (res.error) throw new Error(res.error)
      setCodes(p => [res.code, ...p])
      setForm({ code: '', type: 'percentage', value: '', max_uses: '', expires_at: '' })
      setShowAdd(false)
    } catch (e: unknown) {
      setAddErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    await authedPatch('/api/admin/discount-codes', { id, active })
    setCodes(p => p.map(c => c.id === id ? { ...c, active } : c))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this code?')) return
    await authedDelete(`/api/admin/discount-codes?id=${id}`)
    setCodes(p => p.filter(c => c.id !== id))
  }

  return (
    <CollapsibleSection title="Discount Codes">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">{codes.length} code{codes.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors"
        >
          {showAdd ? 'Cancel' : '+ Add Code'}
        </button>
      </div>

      {showAdd && (
        <div className="border border-gray-200 p-4 mb-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Code *</label>
              <input value={form.code} onChange={e => setF('code', e.target.value.toUpperCase())}
                className={INPUT_CLS} placeholder="SUMMER10" />
            </div>
            <div>
              <label className={LABEL_CLS}>Type *</label>
              <select value={form.type} onChange={e => setF('type', e.target.value as 'percentage' | 'fixed')} className={INPUT_CLS}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (euro cents)</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Value * {form.type === 'percentage' ? '(%)' : '(cents)'}</label>
              <input type="number" min={0} value={form.value} onChange={e => setF('value', e.target.value)}
                className={INPUT_CLS} placeholder={form.type === 'percentage' ? '10' : '1000'} />
            </div>
            <div>
              <label className={LABEL_CLS}>Max Uses (blank = ∞)</label>
              <input type="number" min={1} value={form.max_uses} onChange={e => setF('max_uses', e.target.value)}
                className={INPUT_CLS} placeholder="∞" />
            </div>
            <div className="col-span-2">
              <label className={LABEL_CLS}>Expires At (blank = never)</label>
              <input type="date" value={form.expires_at} onChange={e => setF('expires_at', e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          {addErr && <p className="text-xs text-red-600">{addErr}</p>}
          <button onClick={handleAdd} disabled={saving}
            className="w-full py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40">
            {saving ? 'Creating…' : 'Create Code'}
          </button>
        </div>
      )}

      {!loaded ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : codes.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center border border-dashed border-gray-200">No discount codes yet.</p>
      ) : (
        <div className="space-y-2">
          {codes.map(c => (
            <div key={c.id} className="flex items-center gap-3 border border-gray-200 p-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-black font-mono">{c.code}</span>
                  <span className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 ${
                    c.active ? 'bg-[#1a4a3a]/10 text-[#1a4a3a]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.type === 'percentage' ? `${c.value}% off` : `${fmtEur(c.value)} off`}
                  {' · '}{c.uses_count} use{c.uses_count !== 1 ? 's' : ''}
                  {c.max_uses !== null && ` / ${c.max_uses}`}
                  {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString('en-GB')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleToggle(c.id, !c.active)}
                  className="text-[9px] font-semibold uppercase tracking-widest px-2 py-1 border border-gray-300 text-gray-600 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors">
                  {c.active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleSection>
  )
}

// ── Main MerchManager ─────────────────────────────────────────────────────────

export default function MerchManager() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading,  setLoading]  = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)

  async function load() {
    setLoading(true)
    const data = await authedGet('/api/admin/merch/products')
    setProducts(data.products ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-black">Merch Management</h2>
          <p className="text-xs text-gray-500 mt-1">Products, color variants and images</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors flex-shrink-0"
        >
          + Add Product
        </button>
      </div>

      <VisibilityToggle />

      <div className="space-y-2 mb-4">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : products.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">No products yet.</p>
          </div>
        ) : (
          products.map(p => <ProductRow key={p.id} product={p} onRefresh={load} />)
        )}
      </div>

      <UpsellSection />
      <ShippingRatesSection />
      <DiscountCodesSection />

      {showAdd && (
        <AddProductModal onClose={() => setShowAdd(false)} onRefresh={load} />
      )}
    </div>
  )
}
