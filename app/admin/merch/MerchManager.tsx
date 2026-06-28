'use client'

import { useState } from 'react'

type ShippingRate = { zone: 'IT' | 'EU' | 'WORLD'; price_cents: number }
type DiscountCode = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  active: boolean
}

const ZONE_LABELS: Record<string, string> = {
  IT:    'Italy',
  EU:    'European Union',
  WORLD: 'International',
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

// ── Section shell ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border border-gray-200 mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700">{title}</span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-5 py-5 border-t border-gray-100">{children}</div>}
    </div>
  )
}

const INPUT = 'border border-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] bg-white w-full'
const LABEL = 'block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1'

// ── Shipping Rates section ────────────────────────────────────────────────────

function ShippingRatesSection({ initial }: { initial: ShippingRate[] }) {
  const zones: ('IT' | 'EU' | 'WORLD')[] = ['IT', 'EU', 'WORLD']

  const [prices, setPrices] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = { IT: '0', EU: '0', WORLD: '0' }
    for (const r of initial) m[r.zone] = String(r.price_cents)
    return m
  })
  const [saving,  setSaving]  = useState<Record<string, boolean>>({})
  const [saved,   setSaved]   = useState<Record<string, boolean>>({})
  const [errors,  setErrors]  = useState<Record<string, string>>({})

  async function handleSave(zone: string) {
    setSaving(p => ({ ...p, [zone]: true }))
    setSaved(p => ({ ...p, [zone]: false }))
    setErrors(p => ({ ...p, [zone]: '' }))
    try {
      const res  = await fetch('/api/shipping-rates', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ zone, price_cents: Number(prices[zone]) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setSaved(p => ({ ...p, [zone]: true }))
      setTimeout(() => setSaved(p => ({ ...p, [zone]: false })), 2000)
    } catch (e: unknown) {
      setErrors(p => ({ ...p, [zone]: e instanceof Error ? e.message : 'Error' }))
    } finally {
      setSaving(p => ({ ...p, [zone]: false }))
    }
  }

  return (
    <Section title="Shipping Rates">
      <p className="text-xs text-gray-500 mb-5">
        Prices in euro cents (e.g. 500 = €5,00). Zone is determined by destination country.
      </p>
      <div className="space-y-4">
        {zones.map(zone => (
          <div key={zone} className="flex items-end gap-3">
            <div className="flex-1">
              <label className={LABEL}>{ZONE_LABELS[zone]}</label>
              <input
                type="number"
                min={0}
                value={prices[zone]}
                onChange={e => setPrices(p => ({ ...p, [zone]: e.target.value }))}
                className={INPUT}
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
    </Section>
  )
}

// ── Discount Codes section ────────────────────────────────────────────────────

function DiscountCodesSection({ initial }: { initial: DiscountCode[] }) {
  const [codes,   setCodes]   = useState<DiscountCode[]>(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [addErr,  setAddErr]  = useState('')

  const [form, setForm] = useState({
    code:      '',
    type:      'percentage' as 'percentage' | 'fixed',
    value:     '',
    max_uses:  '',
    expires_at: '',
  })

  function setF(k: keyof typeof form, v: string) {
    setForm(p => ({ ...p, [k]: v }))
  }

  async function handleAdd() {
    if (!form.code.trim() || !form.value) { setAddErr('Code and value are required.'); return }
    setSaving(true)
    setAddErr('')
    try {
      const res  = await fetch('/api/admin/discount-codes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:      form.code.trim().toUpperCase(),
          type:      form.type,
          value:     Number(form.value),
          max_uses:  form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error')
      setCodes(p => [data.code, ...p])
      setForm({ code: '', type: 'percentage', value: '', max_uses: '', expires_at: '' })
      setShowAdd(false)
    } catch (e: unknown) {
      setAddErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch('/api/admin/discount-codes', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active }),
    })
    setCodes(p => p.map(c => c.id === id ? { ...c, active } : c))
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this code?')) return
    await fetch(`/api/admin/discount-codes?id=${id}`, { method: 'DELETE' })
    setCodes(p => p.filter(c => c.id !== id))
  }

  return (
    <Section title="Discount Codes">
      <div className="flex items-center justify-between mb-4">
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
              <label className={LABEL}>Code *</label>
              <input
                value={form.code}
                onChange={e => setF('code', e.target.value.toUpperCase())}
                className={INPUT}
                placeholder="SUMMER10"
              />
            </div>
            <div>
              <label className={LABEL}>Type *</label>
              <select value={form.type} onChange={e => setF('type', e.target.value as 'percentage' | 'fixed')} className={INPUT}>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed (euro cents)</option>
              </select>
            </div>
            <div>
              <label className={LABEL}>
                Value * {form.type === 'percentage' ? '(%)' : '(cents, e.g. 1000 = €10)'}
              </label>
              <input
                type="number"
                min={0}
                value={form.value}
                onChange={e => setF('value', e.target.value)}
                className={INPUT}
                placeholder={form.type === 'percentage' ? '10' : '1000'}
              />
            </div>
            <div>
              <label className={LABEL}>Max Uses (blank = unlimited)</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={e => setF('max_uses', e.target.value)}
                className={INPUT}
                placeholder="∞"
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Expires At (blank = never)</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setF('expires_at', e.target.value)}
                className={INPUT}
              />
            </div>
          </div>
          {addErr && <p className="text-xs text-red-600">{addErr}</p>}
          <button
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-2 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-40"
          >
            {saving ? 'Creating…' : 'Create Code'}
          </button>
        </div>
      )}

      {codes.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No discount codes yet.</p>
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
                  {' · '}
                  {c.uses_count} use{c.uses_count !== 1 ? 's' : ''}
                  {c.max_uses !== null && ` / ${c.max_uses}`}
                  {c.expires_at && ` · expires ${new Date(c.expires_at).toLocaleDateString('en-GB')}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleToggle(c.id, !c.active)}
                  className="text-[9px] font-semibold uppercase tracking-widest px-2 py-1 border border-gray-300 text-gray-600 hover:border-[#1a4a3a] hover:text-[#1a4a3a] transition-colors"
                >
                  {c.active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── MerchManager ──────────────────────────────────────────────────────────────

export default function MerchManager({
  shippingRates,
  discountCodes,
}: {
  shippingRates: ShippingRate[]
  discountCodes: DiscountCode[]
}) {
  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-bold text-[#1a4a3a]">Merch</h1>
        <div className="w-8 h-px bg-[#1a4a3a] mt-2" />
      </div>

      <ShippingRatesSection initial={shippingRates} />
      <DiscountCodesSection initial={discountCodes} />
    </div>
  )
}
