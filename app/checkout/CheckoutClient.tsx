'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCart, type CartItem } from '@/app/components/CartContext'
import { createClient } from '@/lib/supabase'
import type { ShippingAddress } from '@/app/api/merch/checkout/route'

// ── Types ──────────────────────────────────────────────────────────────────────

type UpsellItem = {
  id:          string
  type:        'product' | 'event'
  referenceId: string
  label:       string | null
  name:        string
  price_cents: number | null
  image:       string | null
  eventDate?:  string
}

type StepKey = 'order' | 'shipping' | 'registration' | 'payment'
type StepDef = { key: StepKey; label: string }

type EventRegEntry = {
  eventId:               string
  eventName:             string
  registrationField:     'motivation' | 'panelists' | null
  firstName:             string
  lastName:              string
  email:                 string
  annoStudio:            string
  motivation:            string
  questionsForPanelists: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const EU_COUNTRIES = [
  { code: 'IT', label: 'Italy' },
  { code: 'AT', label: 'Austria' },
  { code: 'BE', label: 'Belgium' },
  { code: 'HR', label: 'Croatia' },
  { code: 'CY', label: 'Cyprus' },
  { code: 'CZ', label: 'Czech Republic' },
  { code: 'DK', label: 'Denmark' },
  { code: 'EE', label: 'Estonia' },
  { code: 'FI', label: 'Finland' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'GR', label: 'Greece' },
  { code: 'HU', label: 'Hungary' },
  { code: 'IE', label: 'Ireland' },
  { code: 'LV', label: 'Latvia' },
  { code: 'LT', label: 'Lithuania' },
  { code: 'LU', label: 'Luxembourg' },
  { code: 'MT', label: 'Malta' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'RO', label: 'Romania' },
  { code: 'SK', label: 'Slovakia' },
  { code: 'SI', label: 'Slovenia' },
  { code: 'ES', label: 'Spain' },
  { code: 'SE', label: 'Sweden' },
]

const ANNO_OPTIONS = [
  '1° anno triennale',
  '2° anno triennale',
  '3° anno triennale',
  '1° anno magistrale',
  '2° anno magistrale',
  'Altro',
]

const INPUT_CLS   = 'w-full border border-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] bg-white'
const LABEL_CLS   = 'block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1'
const SECTION_CLS = 'text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2'

// ── Stepper ────────────────────────────────────────────────────────────────────

function Stepper({ step, stepDefs }: { step: number; stepDefs: StepDef[] }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {stepDefs.map((s, i) => {
        const n = i + 1
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step > n
                  ? 'border-[#1a4a3a] bg-[#1a4a3a] text-white'
                  : step === n
                    ? 'border-[#1a4a3a] bg-white text-[#1a4a3a]'
                    : 'border-gray-300 bg-white text-gray-400'
              }`}>
                {step > n ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : n}
              </div>
              <span className={`text-[9px] font-semibold uppercase tracking-widest ${
                step >= n ? 'text-[#1a4a3a]' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < stepDefs.length - 1 && (
              <div className={`w-12 sm:w-20 h-px mx-2 mb-4 transition-colors ${
                step > n ? 'bg-[#1a4a3a]' : 'bg-gray-200'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Step 1: Order Summary + Upsell ────────────────────────────────────────────

function StepOrder({
  cartItems, upsells, selected, onToggleUpsell, totalCents, onContinue,
}: {
  cartItems:      CartItem[]
  upsells:        UpsellItem[]
  selected:       Set<string>
  onToggleUpsell: (item: UpsellItem) => void
  totalCents:     number
  onContinue:     () => void
}) {
  const tickets  = cartItems.filter(i => i.type === 'ticket')
  const merch    = cartItems.filter(i => !i.type || i.type === 'merch')
  const hasMixed = tickets.length > 0 && merch.length > 0

  function renderMerchItem(item: CartItem) {
    return (
      <div key={item.cartKey} className="flex gap-4 border border-gray-200 p-3">
        {item.variant?.image ? (
          <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 overflow-hidden">
            <Image src={item.variant.image} alt={item.name} fill className="object-cover" />
          </div>
        ) : <div className="w-20 h-20 flex-shrink-0 bg-gray-100" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[item.variant?.color, item.size, item.textVariant].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
        </div>
        <p className="text-sm font-semibold text-black flex-shrink-0">
          {fmtEur(item.priceCents * item.quantity)}
        </p>
      </div>
    )
  }

  function renderTicketItem(item: CartItem) {
    return (
      <div key={item.cartKey} className="flex gap-4 border border-gray-200 p-3">
        <div className="w-20 h-20 flex-shrink-0 bg-[#1a4a3a]/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-[#1a4a3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[item.eventDate ? fmtDate(item.eventDate) : null, item.eventLocation].filter(Boolean).join(' · ')}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Qty: 1</p>
        </div>
        <p className="text-sm font-semibold text-black flex-shrink-0">{fmtEur(item.priceCents)}</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-black mb-6">Your Order</h2>

      <div className="space-y-3 mb-8">
        {tickets.length > 0 && (
          <>
            {hasMixed && <p className={SECTION_CLS}>Tickets</p>}
            {tickets.map(renderTicketItem)}
          </>
        )}
        {merch.length > 0 && (
          <>
            {hasMixed && <p className={`${SECTION_CLS} pt-2`}>Merch</p>}
            {merch.map(renderMerchItem)}
          </>
        )}
      </div>

      {/* Upsell — only when cart has merch */}
      {merch.length > 0 && upsells.length > 0 && (
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400 mb-4">
            You might also like
          </p>
          <div className="space-y-3">
            {upsells.map(u => {
              const isSelected = selected.has(u.id)
              return (
                <div key={u.id}
                  className={`flex items-center gap-4 border p-3 transition-colors ${
                    isSelected ? 'border-[#1a4a3a] bg-[#f4f9f7]' : 'border-gray-200 bg-white'
                  }`}
                >
                  {u.image ? (
                    <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 overflow-hidden">
                      <Image src={u.image} alt={u.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      <span className="text-[9px] uppercase tracking-widest text-gray-400">
                        {u.type === 'event' ? 'Event' : 'Merch'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {u.label && (
                      <p className="text-[9px] font-semibold uppercase tracking-widest text-[#1a4a3a] mb-0.5">{u.label}</p>
                    )}
                    <p className="text-sm font-semibold text-black truncate">{u.name}</p>
                    {u.eventDate && (
                      <p className="text-xs text-gray-500 mt-0.5">{fmtDate(u.eventDate)}</p>
                    )}
                    {u.price_cents !== null && (
                      <p className="text-xs text-gray-600 mt-0.5">{fmtEur(u.price_cents)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onToggleUpsell(u)}
                    className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-widest px-4 py-2 border transition-colors ${
                      isSelected
                        ? 'bg-[#1a4a3a] text-white border-[#1a4a3a] hover:bg-[#143d30]'
                        : 'bg-white text-black border-black hover:bg-gray-50'
                    }`}
                  >
                    {isSelected ? 'Remove' : 'Add'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 mb-6">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Total</p>
          <p className="text-xl font-bold text-black">{fmtEur(totalCents)}</p>
        </div>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-3.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}

// ── Step: Shipping ─────────────────────────────────────────────────────────────

function StepShipping({
  shipping, onChange, onBack, onContinue, error,
}: {
  shipping:   ShippingAddress
  onChange:   (field: keyof ShippingAddress, val: string) => void
  onBack:     () => void
  onContinue: () => void
  error:      string
}) {
  function field(key: keyof ShippingAddress, label: string, opts?: {
    required?: boolean; type?: string; placeholder?: string; colSpan?: boolean
  }) {
    return (
      <div className={opts?.colSpan ? 'sm:col-span-2' : ''}>
        <label className={LABEL_CLS}>{label}{opts?.required !== false ? ' *' : ''}</label>
        <input
          type={opts?.type ?? 'text'}
          value={shipping[key]}
          onChange={e => onChange(key, e.target.value)}
          placeholder={opts?.placeholder}
          className={INPUT_CLS}
          required={opts?.required !== false}
        />
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-black mb-6">Shipping Details</h2>

      {error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {field('firstName', 'First Name')}
        {field('lastName',  'Last Name')}
        {field('email',     'Email', { type: 'email' })}
        {field('addressLine1', 'Address', { colSpan: true })}
        {field('addressLine2', 'Apartment, suite, etc.', { required: false, colSpan: true, placeholder: 'Optional' })}
        {field('city',       'City')}
        {field('postalCode', 'Postal Code')}
        <div>
          <label className={LABEL_CLS}>Country *</label>
          <select value={shipping.country} onChange={e => onChange('country', e.target.value)} className={INPUT_CLS}>
            {EU_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="px-6 py-3.5 border border-black bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onContinue}
          className="flex-1 py-3.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── Step: Event Registration ───────────────────────────────────────────────────

function StepRegistration({
  eventRegs, onChange, onBack, onContinue, error,
}: {
  eventRegs:  EventRegEntry[]
  onChange:   (eventId: string, field: keyof EventRegEntry, val: string) => void
  onBack:     () => void
  onContinue: () => void
  error:      string
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-black mb-6">Event Registration</h2>

      {error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2 mb-4">{error}</p>
      )}

      <div className="space-y-8">
        {eventRegs.map(reg => (
          <div key={reg.eventId}>
            {eventRegs.length > 1 && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] mb-4 pb-2 border-b border-[#1a4a3a]/20">
                {reg.eventName}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLS}>First Name *</label>
                <input
                  value={reg.firstName}
                  onChange={e => onChange(reg.eventId, 'firstName', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Last Name *</label>
                <input
                  value={reg.lastName}
                  onChange={e => onChange(reg.eventId, 'lastName', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Email *</label>
                <input
                  type="email"
                  value={reg.email}
                  onChange={e => onChange(reg.eventId, 'email', e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS}>Anno di studio *</label>
                <select
                  value={reg.annoStudio}
                  onChange={e => onChange(reg.eventId, 'annoStudio', e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="">Select year</option>
                  {ANNO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {reg.registrationField === 'motivation' && (
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>Why do you want to attend? *</label>
                  <textarea
                    rows={3}
                    value={reg.motivation}
                    onChange={e => onChange(reg.eventId, 'motivation', e.target.value)}
                    className={`${INPUT_CLS} resize-none`}
                  />
                </div>
              )}
              {reg.registrationField === 'panelists' && (
                <div className="sm:col-span-2">
                  <label className={LABEL_CLS}>Questions for the panelists *</label>
                  <textarea
                    rows={3}
                    value={reg.questionsForPanelists}
                    onChange={e => onChange(reg.eventId, 'questionsForPanelists', e.target.value)}
                    className={`${INPUT_CLS} resize-none`}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onBack}
          className="px-6 py-3.5 border border-black bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onContinue}
          className="flex-1 py-3.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors">
          Continue →
        </button>
      </div>
    </div>
  )
}

// ── Step: Payment ──────────────────────────────────────────────────────────────

function StepPayment({
  totalCents, shipping, hasMerch, onBack, onPay, paying, error,
}: {
  totalCents: number
  shipping:   ShippingAddress
  hasMerch:   boolean
  onBack:     () => void
  onPay:      () => void
  paying:     boolean
  error:      string
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-black mb-6">Payment</h2>

      <div className="border border-gray-200 p-4 mb-6 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Order Summary</p>
        {hasMerch && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping to</span>
            <span className="text-black font-medium">
              {shipping.firstName} {shipping.lastName}, {shipping.city}, {shipping.country}
            </span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
          <span className="font-semibold uppercase tracking-widest text-[10px] text-gray-500">Total</span>
          <span className="text-black font-bold">{fmtEur(totalCents)}</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2 mb-4">{error}</p>
      )}

      <p className="text-xs text-gray-500 mb-4">
        You will be redirected to Stripe's secure checkout to complete your payment.
      </p>

      <div className="flex gap-3">
        <button onClick={onBack} disabled={paying}
          className="px-6 py-3.5 border border-black bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-gray-50 transition-colors disabled:opacity-40">
          ← Back
        </button>
        <button onClick={onPay} disabled={paying}
          className="flex-1 py-3.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors disabled:opacity-60">
          {paying ? 'Redirecting…' : `Pay ${fmtEur(totalCents)} →`}
        </button>
      </div>
    </div>
  )
}

// ── Main CheckoutClient ────────────────────────────────────────────────────────

export default function CheckoutClient() {
  const router = useRouter()
  const { items: cartItems, totalCents: cartTotal, clearCart } = useCart()

  const hasMerch  = cartItems.some(i => !i.type || i.type === 'merch')
  const hasTicket = cartItems.some(i => i.type === 'ticket')

  // Dynamic step list based on cart contents
  const stepDefs = useMemo<StepDef[]>(() => {
    const s: StepDef[] = [{ key: 'order', label: 'Order' }]
    if (hasMerch)  s.push({ key: 'shipping',     label: 'Shipping'     })
    if (hasTicket) s.push({ key: 'registration',  label: 'Registration' })
    s.push({ key: 'payment', label: 'Payment' })
    return s
  }, [hasMerch, hasTicket])

  const [step,     setStep]     = useState(1)
  const [upsells,  setUpsells]  = useState<UpsellItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paying,   setPaying]   = useState(false)
  const [error,    setError]    = useState('')

  const [shipping, setShipping] = useState<ShippingAddress>({
    firstName: '', lastName: '', email: '',
    addressLine1: '', addressLine2: '', city: '', postalCode: '', country: 'IT',
  })

  const [eventRegs, setEventRegs] = useState<EventRegEntry[]>([])

  // Redirect if cart is empty
  useEffect(() => {
    if (cartItems.length === 0) router.replace('/merch')
  }, [cartItems, router])

  // Fetch upsell items (only relevant for merch)
  useEffect(() => {
    if (!hasMerch) return
    fetch('/api/merch/upsell')
      .then(r => r.json())
      .then(d => setUpsells(d.items ?? []))
      .catch(() => {})
  }, [hasMerch])

  // Init event registration entries + fetch registration_field per event
  useEffect(() => {
    if (!hasTicket) return
    const tickets = cartItems.filter(i => i.type === 'ticket')

    setEventRegs(tickets.map(t => ({
      eventId:               t.eventId ?? t.cartKey,
      eventName:             t.name,
      registrationField:     null,
      firstName:             '',
      lastName:              '',
      email:                 '',
      annoStudio:            '',
      motivation:            '',
      questionsForPanelists: '',
    })))

    const ids = tickets.map(t => t.eventId).filter(Boolean) as string[]
    if (ids.length === 0) return

    createClient()
      .from('upcoming_events')
      .select('id, registration_field')
      .in('id', ids)
      .then(({ data }) => {
        if (!data) return
        const fieldMap = new Map(
          (data as { id: string; registration_field: 'motivation' | 'panelists' | null }[])
            .map(e => [e.id, e.registration_field])
        )
        setEventRegs(prev => prev.map(r => ({
          ...r,
          registrationField: fieldMap.get(r.eventId) ?? null,
        })))
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTicket])

  function toggleUpsell(item: UpsellItem) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
      return next
    })
  }

  const selectedUpsells = upsells.filter(u => selected.has(u.id))
  const totalCents = cartTotal + selectedUpsells.reduce((s, u) => s + (u.price_cents ?? 0), 0)

  // ── Validation ──────────────────────────────────────────────────────────────

  function validateShipping(): string {
    if (!shipping.firstName.trim()) return 'First name is required.'
    if (!shipping.lastName.trim())  return 'Last name is required.'
    if (!shipping.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email))
      return 'A valid email is required.'
    if (!shipping.addressLine1.trim()) return 'Address is required.'
    if (!shipping.city.trim())         return 'City is required.'
    if (!shipping.postalCode.trim())   return 'Postal code is required.'
    return ''
  }

  function validateRegistrations(): string {
    for (const r of eventRegs) {
      if (!r.firstName.trim())  return 'First name is required.'
      if (!r.lastName.trim())   return 'Last name is required.'
      if (!r.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
        return 'A valid email is required.'
      if (!r.annoStudio) return 'Year of study is required.'
      if (r.registrationField === 'motivation' && !r.motivation.trim())
        return 'Please tell us why you want to attend.'
      if (r.registrationField === 'panelists' && !r.questionsForPanelists.trim())
        return 'Please enter your questions for the panelists.'
    }
    return ''
  }

  // ── Step navigation ─────────────────────────────────────────────────────────

  const currentKey = stepDefs[step - 1]?.key

  function handleShippingContinue() {
    const err = validateShipping()
    if (err) { setError(err); return }
    setError('')
    // Pre-fill registration entries with shipping contact info
    if (hasTicket) {
      setEventRegs(prev => prev.map(r => ({
        ...r,
        firstName: r.firstName || shipping.firstName,
        lastName:  r.lastName  || shipping.lastName,
        email:     r.email     || shipping.email,
      })))
    }
    setStep(s => s + 1)
  }

  function handleRegistrationContinue() {
    const err = validateRegistrations()
    if (err) { setError(err); return }
    setError('')
    setStep(s => s + 1)
  }

  // ── Customer info derivation ─────────────────────────────────────────────────

  function getCustomerInfo() {
    if (hasMerch) {
      return {
        name:  `${shipping.firstName} ${shipping.lastName}`.trim(),
        email: shipping.email,
      }
    }
    if (hasTicket && eventRegs.length > 0) {
      return {
        name:  `${eventRegs[0].firstName} ${eventRegs[0].lastName}`.trim(),
        email: eventRegs[0].email,
      }
    }
    return { name: '', email: '' }
  }

  // ── Pay ──────────────────────────────────────────────────────────────────────

  async function handlePay() {
    setPaying(true)
    setError('')
    try {
      const { name: customerName, email: customerEmail } = getCustomerInfo()

      const lineItems = [
        ...cartItems.filter(i => !i.type || i.type === 'merch').map(item => ({
          type:         'merch' as const,
          referenceId:  item.productId ?? item.cartKey,
          name:         item.name,
          priceCents:   item.priceCents,
          variantColor: item.variant?.color,
          size:         item.size,
          quantity:     item.quantity,
        })),
        ...cartItems.filter(i => i.type === 'ticket').map(item => ({
          type:          'ticket' as const,
          referenceId:   item.eventId ?? item.cartKey,
          name:          item.name,
          priceCents:    item.priceCents,
          quantity:      item.quantity,
          eventDate:     item.eventDate,
          eventLocation: item.eventLocation ?? undefined,
        })),
        ...selectedUpsells.map(u => ({
          type:        'merch' as const,
          referenceId: u.referenceId,
          name:        u.name,
          priceCents:  u.price_cents ?? 0,
          quantity:    1,
        })),
      ]

      const eventRegistrations = hasTicket
        ? eventRegs.map(r => ({
            eventId:               r.eventId,
            firstName:             r.firstName,
            lastName:              r.lastName,
            email:                 r.email,
            annoStudio:            r.annoStudio,
            motivation:            r.motivation || undefined,
            questionsForPanelists: r.questionsForPanelists || undefined,
          }))
        : undefined

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lineItems,
          customerName,
          customerEmail,
          shippingAddress: hasMerch ? shipping : null,
          eventRegistrations,
        }),
      })
      const data = await res.json()
      if (data.url) {
        clearCart()
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setPaying(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setPaying(false)
    }
  }

  if (cartItems.length === 0) return null

  const backLabel = hasTicket && !hasMerch ? '← Back to Events' : '← Back to Shop'
  const backHref  = hasTicket && !hasMerch ? '/events' : '/merch'

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Left — branding panel (desktop only) */}
      <div className="hidden md:block md:w-1/2 relative">
        <Image
          src="/capitolino.jpg"
          alt="Capitolino"
          fill
          className="object-cover grayscale"
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}
          className="h-full flex flex-col items-center justify-center px-12 text-white text-center">
          <p className="font-serif italic text-3xl lg:text-4xl leading-snug mb-5">
            Great investments start with great people.
          </p>
          <p className="text-xs tracking-widest uppercase text-white/60">
            Alata Investment Club — Brescia
          </p>
        </div>
      </div>

      {/* Right — checkout panel */}
      <div className="w-full md:w-1/2 flex flex-col bg-white">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <Link href={backHref} className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] hover:underline">
            {backLabel}
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Alata Investment Club
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-lg mx-auto px-6 py-10">
            <Stepper step={step} stepDefs={stepDefs} />

            {currentKey === 'order' && (
              <StepOrder
                cartItems={cartItems}
                upsells={upsells}
                selected={selected}
                onToggleUpsell={toggleUpsell}
                totalCents={totalCents}
                onContinue={() => { setError(''); setStep(2) }}
              />
            )}

            {currentKey === 'shipping' && (
              <StepShipping
                shipping={shipping}
                onChange={(f, v) => setShipping(prev => ({ ...prev, [f]: v }))}
                onBack={() => { setError(''); setStep(s => s - 1) }}
                onContinue={handleShippingContinue}
                error={error}
              />
            )}

            {currentKey === 'registration' && (
              <StepRegistration
                eventRegs={eventRegs}
                onChange={(eventId, field, val) =>
                  setEventRegs(prev => prev.map(r =>
                    r.eventId === eventId ? { ...r, [field]: val } : r
                  ))
                }
                onBack={() => { setError(''); setStep(s => s - 1) }}
                onContinue={handleRegistrationContinue}
                error={error}
              />
            )}

            {currentKey === 'payment' && (
              <StepPayment
                totalCents={totalCents}
                shipping={shipping}
                hasMerch={hasMerch}
                onBack={() => { setError(''); setStep(s => s - 1) }}
                onPay={handlePay}
                paying={paying}
                error={error}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
