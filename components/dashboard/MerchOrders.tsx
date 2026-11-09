'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FieldRow, SegmentedPills } from '@/app/components/member/ui'
import {
  Numbers, Toolbar, SearchField, SelectField, Split, CrmTable, CrmRow, NameCell, Sheet, SheetEmpty, Heading, BlockField,
  cell, revealSheet, fieldCls, labelCls, btnPrimary, btnGhost, errorCls, type Column,
} from '@/components/admin/crm/ui'

/*
 * Merch orders for the Media team (Merch section of /dashboard/team/media):
 * list on the left, the order's sheet on the right (below on a phone). Data
 * comes from /api/admin/merch/orders (server, service role, Media or
 * BoD/Management only); from here only the fulfillment can be changed.
 */

type Fulfillment = 'new' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'

type Item = { product_name: string; variant_color: string | null; size: string | null; quantity: number; unit_price_cents: number | null }
type Tx = { id: string; date: string | null; type: string; amount: number; gross_amount: number | null; stripe_fee: number | null; description: string | null }
type Address = Record<string, string | null | undefined>

type Order = {
  id: string
  created_at: string
  status: string | null
  customer_name: string | null
  customer_email: string | null
  phone: string | null
  shipping_address: Address | null
  shipping_zone: string | null
  shipping_cents: number | null
  discount_code: string | null
  discount_cents: number | null
  price_cents: number
  upsell_items: unknown
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  fulfillment_status: Fulfillment
  carrier: string | null
  tracking_code: string | null
  shipped_at: string | null
  internal_notes: string | null
  items: Item[]
  transactions: Tx[]
}

const FULFILLMENT: { value: Fulfillment; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]
const FULFILLMENT_LABEL = Object.fromEntries(FULFILLMENT.map(f => [f.value, f.label])) as Record<Fulfillment, string>
const TO_SHIP: Fulfillment[] = ['new', 'preparing']

const PAYMENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
] as const
const SORTS = [
  { value: 'desc', label: 'Newest' },
  { value: 'asc', label: 'Oldest' },
] as const

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const sizeRank = (s: string) => { const i = SIZE_ORDER.indexOf(s.toUpperCase()); return i < 0 ? 99 : i }

const COLUMNS: Column[] = [
  { label: 'Order' },
  { label: 'Qty', wide: true, align: 'right' },
  { label: 'Total', wide: true, align: 'right' },
  { label: 'Status', align: 'right' },
  { label: 'Date', wide: true, align: 'right' },
]
const TEMPLATE = 'grid-cols-[minmax(0,1fr)_76px] sm:grid-cols-[minmax(0,1fr)_40px_68px_76px_76px]'

const eur = (cents: number | null | undefined) => cents == null ? '—' : `€${(cents / 100).toFixed(2).replace('.', ',')}`
const eurNum = (n: number | null | undefined) => n == null ? '—' : `€${Number(n).toFixed(2).replace('.', ',')}`
const shortId = (id: string) => id.slice(0, 8).toUpperCase()
const day = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const dayShort = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
const itemText = (it: Item) => [it.product_name, it.variant_color, it.size].filter(Boolean).join(' · ')
const qtyOf = (o: Order) => o.items.reduce((s, it) => s + it.quantity, 0)

/** "Mario De Rossi" → Mario / De Rossi: split at the first space. */
function splitName(full: string | null): [string, string] {
  const t = (full ?? '').trim()
  if (!t) return ['', '']
  const i = t.indexOf(' ')
  return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 1).trim()]
}

function addressLines(a: Address | null): string[] {
  if (!a) return []
  const name = [a.firstName, a.lastName].filter(Boolean).join(' ')
  const cityLine = [a.postalCode, a.city, a.province ?? a.state].filter(Boolean).join(' ')
  return [name, a.addressLine1, a.addressLine2, cityLine, a.country].filter((l): l is string => !!l && !!String(l).trim())
}

function upsellList(v: unknown): { name: string; detail: string }[] {
  if (!Array.isArray(v)) return []
  return v.map(x => {
    const o = (x ?? {}) as Record<string, unknown>
    const qty = typeof o.quantity === 'number' ? o.quantity : 1
    const price = typeof o.price === 'number' ? `€${o.price.toFixed(2).replace('.', ',')}` : typeof o.priceCents === 'number' ? eur(o.priceCents) : ''
    return { name: String(o.name ?? o.title ?? 'Item'), detail: [`${qty}×`, price].filter(Boolean).join(' ') }
  })
}

function stripeUrl(o: Order) {
  if (!o.stripe_payment_intent_id) return null
  const test = o.stripe_session_id.startsWith('cs_test_') || o.stripe_payment_intent_id.startsWith('pi_test')
  return `https://dashboard.stripe.com/${test ? 'test/' : ''}payments/${o.stripe_payment_intent_id}`
}

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? '' : String(v)
  return /[",;\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** One line per article, to prepare the parcels. */
function downloadCsv(orders: Order[]) {
  const head = ['Order', 'Date', 'Payment', 'Fulfillment', 'First name', 'Last name', 'Email', 'Phone',
    'Address line 1', 'Address line 2', 'Postal code', 'City', 'Country', 'Zone',
    'Product', 'Colour', 'Size', 'Quantity', 'Unit price', 'Order total', 'Carrier', 'Tracking', 'Shipped on', 'Notes']
  const rows = orders.flatMap(o => {
    const [first, last] = splitName(o.customer_name)
    const a = o.shipping_address ?? {}
    return o.items.map(it => [
      shortId(o.id), o.created_at.slice(0, 10), o.status ?? '', FULFILLMENT_LABEL[o.fulfillment_status] ?? o.fulfillment_status,
      first, last, o.customer_email ?? '', o.phone ?? '',
      a.addressLine1 ?? '', a.addressLine2 ?? '', a.postalCode ?? '', a.city ?? '', a.country ?? '', o.shipping_zone ?? '',
      it.product_name, it.variant_color ?? '', it.size ?? '', it.quantity,
      it.unit_price_cents != null ? (it.unit_price_cents / 100).toFixed(2) : '', (o.price_cents / 100).toFixed(2),
      o.carrier ?? '', o.tracking_code ?? '', o.shipped_at ? o.shipped_at.slice(0, 10) : '', o.internal_notes ?? '',
    ])
  })
  const csv = [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `merch-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Fulfillment form ──────────────────────────────────────────────────────────

function FulfillmentForm({ order, onSaved }: { order: Order; onSaved: (o: Partial<Order> & { id: string }) => void }) {
  const [status, setStatus] = useState<Fulfillment>(order.fulfillment_status)
  const [carrier, setCarrier] = useState(order.carrier ?? '')
  const [tracking, setTracking] = useState(order.tracking_code ?? '')
  const [shippedOn, setShippedOn] = useState(order.shipped_at ? order.shipped_at.slice(0, 10) : '')
  const [notes, setNotes] = useState(order.internal_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = status !== order.fulfillment_status
    || carrier !== (order.carrier ?? '')
    || tracking !== (order.tracking_code ?? '')
    || shippedOn !== (order.shipped_at ? order.shipped_at.slice(0, 10) : '')
    || notes !== (order.internal_notes ?? '')

  function changeStatus(s: Fulfillment) {
    setStatus(s)
    setSaved(false)
    // Shipping usually happens today: offer the date, it is saved only with Save.
    if (s === 'shipped' && !shippedOn) setShippedOn(new Date().toISOString().slice(0, 10))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/merch/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fulfillment_status: status, carrier, tracking_code: tracking, shipped_at: shippedOn || null, internal_notes: notes }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Could not save'); return }
    onSaved(json.order)
    setSaved(true)
  }

  const set = (f: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { f(e.target.value); setSaved(false) }

  return (
    <div className="space-y-5 pt-5">
      <div>
        <span className={`${labelCls} mb-2`}>Status</span>
        <SegmentedPills size="sm" label="Fulfillment status" options={FULFILLMENT} value={status} onChange={changeStatus} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block"><span className={labelCls}>Carrier</span>
          <input value={carrier} onChange={set(setCarrier)} maxLength={100} placeholder="Poste, BRT, GLS…" className={fieldCls} /></label>
        <label className="block"><span className={labelCls}>Tracking</span>
          <input value={tracking} onChange={set(setTracking)} maxLength={200} className={fieldCls} /></label>
        <label className="block"><span className={labelCls}>Shipped on</span>
          <input type="date" value={shippedOn} onChange={set(setShippedOn)} className={fieldCls} /></label>
      </div>
      <label className="block"><span className={labelCls}>Internal notes</span>
        <textarea rows={3} value={notes} onChange={set(setNotes)} maxLength={4000} placeholder="Only the team sees this." className={`${fieldCls} resize-none`} /></label>
      {error && <p className={errorCls}>{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
        {saved && !dirty && <span className="text-[12px] text-earth-600">Saved.</span>}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MerchOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [payment, setPayment] = useState<'all' | 'paid' | 'refunded'>('all')
  const [fulfillment, setFulfillment] = useState<'' | 'to_ship' | Fulfillment>('')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/admin/merch/orders')
      .then(async r => {
        const json = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(json.error ?? 'Could not load the orders')
        setOrders(json.orders ?? [])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = orders.filter(o => {
      if (payment !== 'all' && o.status !== payment) return false
      if (fulfillment === 'to_ship' ? !TO_SHIP.includes(o.fulfillment_status) : fulfillment && o.fulfillment_status !== fulfillment) return false
      if (!q) return true
      return [o.customer_name, o.customer_email, o.phone, o.id, shortId(o.id)]
        .some(v => v && v.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, '')))
    })
    return list.sort((a, b) => sort === 'desc' ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at))
  }, [orders, search, payment, fulfillment, sort])

  // Sizes still to send: paid orders not yet shipped, every article counted.
  const toShip = useMemo(() => orders.filter(o => o.status === 'paid' && TO_SHIP.includes(o.fulfillment_status)), [orders])
  const sizeSummary = useMemo(() => {
    const totals = new Map<string, number>()
    const lines = new Map<string, Map<string, number>>()
    for (const o of toShip) for (const it of o.items) {
      const size = it.size || 'One size'
      totals.set(size, (totals.get(size) ?? 0) + it.quantity)
      const key = [it.product_name, it.variant_color].filter(Boolean).join(' · ')
      const m = lines.get(key) ?? new Map<string, number>()
      m.set(size, (m.get(size) ?? 0) + it.quantity)
      lines.set(key, m)
    }
    const bySize = (m: Map<string, number>) => [...m.entries()].sort((a, b) => sizeRank(a[0]) - sizeRank(b[0]))
    return { totals: bySize(totals), lines: [...lines.entries()].map(([k, m]) => [k, bySize(m)] as const) }
  }, [toShip])

  const current = orders.find(o => o.id === openId) ?? null
  const paidRevenue = orders.filter(o => o.status === 'paid').reduce((s, o) => s + o.price_cents, 0)

  function open(id: string) {
    setOpenId(id)
    setCopied(false)
    revealSheet(sheetRef.current)
  }

  function applySaved(patch: Partial<Order> & { id: string }) {
    setOrders(prev => prev.map(o => o.id === patch.id ? { ...o, ...patch } : o))
  }

  async function copyAddress(o: Order) {
    const lines = addressLines(o.shipping_address)
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
  }

  if (loading) return <p className="py-10 text-[13px] text-earth-600">Loading orders…</p>
  if (error) return <p className={errorCls}>{error}</p>

  const [first, last] = splitName(current?.customer_name ?? null)
  const itemsTotal = current ? current.items.reduce((s, it) => s + (it.unit_price_cents ?? 0) * it.quantity, 0) : 0
  const upsells = current ? upsellList(current.upsell_items) : []
  const stripe = current ? stripeUrl(current) : null

  return (
    <div>
      <Numbers items={[
        { value: orders.length, label: 'Orders' },
        { value: toShip.length, label: 'To ship' },
        { value: toShip.reduce((s, o) => s + qtyOf(o), 0), label: 'Items to ship' },
        { value: `€${Math.round(paidRevenue / 100).toLocaleString('it-IT')}`, label: 'Paid, total' },
      ]} />

      <section className="mt-10">
        <Heading title="Sizes to prepare" meta={`${toShip.length} order${toShip.length !== 1 ? 's' : ''} not shipped`} />
        <div className="border-t border-night">
          {sizeSummary.totals.length === 0 ? (
            <p className="border-b border-night/20 py-6 text-[13px] text-earth-600">Nothing to ship.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-10 gap-y-4 border-b border-night/20 py-5">
                {sizeSummary.totals.map(([size, n]) => (
                  <div key={size}>
                    <div className="rd-num font-serif text-[40px] font-medium leading-none">{n}</div>
                    <div className="rd-eyebrow mt-1.5 text-[10px] text-earth-600">{size}</div>
                  </div>
                ))}
              </div>
              {sizeSummary.lines.map(([name, sizes]) => (
                <FieldRow key={name} label="Product" value={name} aside={sizes.map(([s, n]) => `${s} ${n}`).join(' · ')} />
              ))}
            </>
          )}
        </div>
      </section>

      <Toolbar actions={<button type="button" onClick={() => downloadCsv(filtered)} disabled={filtered.length === 0} className={btnGhost}>Export CSV ({filtered.length})</button>}>
        <SearchField value={search} onChange={setSearch} placeholder="Name, email, phone, order…" />
        <SelectField label="Fulfillment" value={fulfillment} onChange={v => setFulfillment(v as typeof fulfillment)} width="sm:w-[170px]">
          <option value="">All</option>
          <option value="to_ship">To ship</option>
          {FULFILLMENT.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </SelectField>
        <div>
          <span className={`${labelCls} mb-2`}>Payment</span>
          <SegmentedPills size="sm" label="Payment" options={[...PAYMENT_FILTERS]} value={payment} onChange={setPayment} />
        </div>
        <div>
          <span className={`${labelCls} mb-2`}>Date</span>
          <SegmentedPills size="sm" label="Sort by date" options={[...SORTS]} value={sort} onChange={setSort} />
        </div>
      </Toolbar>

      <Split
        sheetRef={sheetRef}
        list={
          <CrmTable
            title="Orders"
            meta={filtered.length === orders.length ? orders.length : `${filtered.length} of ${orders.length}`}
            columns={COLUMNS}
            template={TEMPLATE}
            isEmpty={filtered.length === 0}
            empty="No orders match."
          >
            {filtered.map(o => (
              <CrmRow key={o.id} template={TEMPLATE} selected={o.id === openId} onOpen={() => open(o.id)} label={`Open order ${shortId(o.id)}`}>
                <span className={cell(COLUMNS[0])}>
                  <NameCell
                    name={o.customer_name || o.customer_email || '—'}
                    sub={`#${shortId(o.id)} · ${o.items.map(it => `${it.quantity}× ${[it.variant_color, it.size].filter(Boolean).join(' ') || it.product_name}`).join(', ')}`}
                  />
                </span>
                <span className={cell(COLUMNS[1], 'rd-num text-[12px] text-earth-700')}>{qtyOf(o)}</span>
                <span className={cell(COLUMNS[2], 'rd-num text-[12px] text-earth-700')}>{eur(o.price_cents)}</span>
                <span className={cell(COLUMNS[3], `text-[12px] ${o.status === 'refunded' ? 'text-[#8a2a1d]' : 'text-earth-700'}`)}>
                  {o.status === 'refunded' ? 'Refunded' : FULFILLMENT_LABEL[o.fulfillment_status] ?? o.fulfillment_status}
                </span>
                <span className={cell(COLUMNS[4], 'rd-num text-[12px] text-earth-700')}>{dayShort(o.created_at)}</span>
              </CrmRow>
            ))}
          </CrmTable>
        }
        sheet={
          current ? (
            <div key={current.id}>
              <Sheet title="Order" meta={`#${shortId(current.id)}`}>
                <FieldRow label="First name" value={first || '—'} muted={!first} />
                <FieldRow label="Last name" value={last || '—'} muted={!last} />
                <FieldRow label="Email" value={current.customer_email ? <a href={`mailto:${current.customer_email}`} className="hover:underline">{current.customer_email}</a> : '—'} muted={!current.customer_email} />
                <FieldRow label="Phone" value={current.phone || '—'} muted={!current.phone} />
                <FieldRow label="Date" value={new Date(current.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                <BlockField label="Shipping address">
                  {addressLines(current.shipping_address).length ? addressLines(current.shipping_address).join('\n') : '—'}
                </BlockField>
                <div className="pt-4">
                  <button type="button" onClick={() => copyAddress(current)} disabled={!addressLines(current.shipping_address).length} className={btnGhost}>
                    {copied ? 'Address copied' : 'Copy address'}
                  </button>
                </div>
              </Sheet>

              <section className="mt-10">
                <Heading title="Items" meta={`${qtyOf(current)} item${qtyOf(current) !== 1 ? 's' : ''}`} />
                <div className="border-t border-night">
                  {current.items.map((it, i) => (
                    <FieldRow
                      key={i}
                      label={`${it.quantity} ×`}
                      value={itemText(it)}
                      aside={it.unit_price_cents != null ? `${eur(it.unit_price_cents)}${it.quantity > 1 ? ` · ${eur(it.unit_price_cents * it.quantity)}` : ''}` : undefined}
                    />
                  ))}
                  {upsells.map((u, i) => <FieldRow key={`u${i}`} label="Add-on" value={u.name} aside={u.detail} />)}
                </div>
              </section>

              <section className="mt-10">
                <Heading title="Payment" meta={current.status === 'refunded' ? 'Refunded' : current.status === 'paid' ? 'Paid' : current.status ?? '—'} />
                <div className="border-t border-night">
                  {itemsTotal > 0 && <FieldRow label="Items" value={eur(itemsTotal)} />}
                  <FieldRow label="Shipping" value={eur(current.shipping_cents)} aside={current.shipping_zone ?? undefined} muted={current.shipping_cents == null} />
                  <FieldRow label="Discount" value={current.discount_cents ? `−${eur(current.discount_cents)}` : '—'} aside={current.discount_code ?? undefined} muted={!current.discount_cents} />
                  <FieldRow label="Total paid" value={<span className="font-semibold">{eur(current.price_cents)}</span>} />
                  <FieldRow label="Stripe" value={stripe ? <a href={stripe} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Open the payment</a> : '—'} muted={!stripe} aside={current.stripe_payment_intent_id ?? undefined} />
                  {current.transactions.length === 0 ? (
                    <FieldRow label="Finance" value="No transaction linked" muted />
                  ) : current.transactions.map(t => (
                    <BlockField key={t.id} label={t.type === 'rimborso' ? 'Refund in Finance' : 'Transaction in Finance'}>
                      {`${t.date ? day(t.date) : '—'} · ${eurNum(t.amount)}${t.stripe_fee ? `, net of ${eurNum(t.stripe_fee)} Stripe fee` : ''}`}
                      {t.description && <span className="block text-[12px] text-earth-600">{t.description}</span>}
                    </BlockField>
                  ))}
                </div>
              </section>

              <section className="mt-10">
                <Heading title="Fulfillment" meta={FULFILLMENT_LABEL[current.fulfillment_status]} />
                <div className="border-t border-night">
                  <FulfillmentForm key={current.id} order={current} onSaved={applySaved} />
                </div>
              </section>
            </div>
          ) : (
            <SheetEmpty title="Order" text="Open an order to see the customer, the address, every item and the payment, and to update the shipping." />
          )
        }
      />
    </div>
  )
}
