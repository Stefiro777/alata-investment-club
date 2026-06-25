'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCart, type CartItem } from '@/app/components/CartContext'
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

type Step = 1 | 2 | 3

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

const INPUT_CLS = 'w-full border border-black px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#1a4a3a] bg-white'
const LABEL_CLS = 'block text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1'
const SECTION_CLS = 'text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2'

// ── Stepper ────────────────────────────────────────────────────────────────────

function Stepper({ step, hasMerch }: { step: Step; hasMerch: boolean }) {
  const steps = hasMerch
    ? [{ n: 1, label: 'Order' }, { n: 2, label: 'Shipping' }, { n: 3, label: 'Payment' }]
    : [{ n: 1, label: 'Order' }, { n: 2, label: 'Contact' }, { n: 3, label: 'Payment' }]

  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              step > s.n
                ? 'border-[#1a4a3a] bg-[#1a4a3a] text-white'
                : step === s.n
                  ? 'border-[#1a4a3a] bg-white text-[#1a4a3a]'
                  : 'border-gray-300 bg-white text-gray-400'
            }`}>
              {step > s.n ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : s.n}
            </div>
            <span className={`text-[9px] font-semibold uppercase tracking-widest ${
              step >= s.n ? 'text-[#1a4a3a]' : 'text-gray-400'
            }`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-16 sm:w-24 h-px mx-2 mb-4 transition-colors ${
              step > s.n ? 'bg-[#1a4a3a]' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
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
  const tickets = cartItems.filter(i => i.type === 'ticket')
  const merch   = cartItems.filter(i => !i.type || i.type === 'merch')
  const career  = cartItems.filter(i => i.type === 'career')
  const typeCount = [tickets.length > 0, merch.length > 0, career.length > 0].filter(Boolean).length
  const hasMixed = typeCount > 1

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

  function renderCareerItem(item: CartItem) {
    return (
      <div key={item.cartKey} className="flex gap-4 border border-gray-200 p-3">
        <div className="w-20 h-20 flex-shrink-0 bg-[#1a4a3a]/10 flex items-center justify-center">
          <svg className="w-7 h-7 text-[#1a4a3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">Career Service</p>
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
        {career.length > 0 && (
          <>
            {hasMixed && <p className={`${SECTION_CLS} pt-2`}>Services</p>}
            {career.map(renderCareerItem)}
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

// ── Step 2a: Shipping (merch present) ─────────────────────────────────────────

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
          Proceed to Payment →
        </button>
      </div>
    </div>
  )
}

// ── Step 2b: Contact (no merch — only name + email needed) ────────────────────

type ContactInfo = { firstName: string; lastName: string; email: string }

function StepContact({
  contact, onChange, onBack, onContinue, error,
}: {
  contact:    ContactInfo
  onChange:   (field: keyof ContactInfo, val: string) => void
  onBack:     () => void
  onContinue: () => void
  error:      string
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-black mb-6">Contact Details</h2>

      {error && (
        <p className="text-xs text-red-600 border border-red-200 bg-red-50 px-3 py-2 mb-4">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className={LABEL_CLS}>First Name *</label>
          <input value={contact.firstName} onChange={e => onChange('firstName', e.target.value)} className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>Last Name *</label>
          <input value={contact.lastName} onChange={e => onChange('lastName', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="sm:col-span-2">
          <label className={LABEL_CLS}>Email *</label>
          <input type="email" value={contact.email} onChange={e => onChange('email', e.target.value)} className={INPUT_CLS} />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="px-6 py-3.5 border border-black bg-white text-black text-[10px] font-semibold uppercase tracking-widest hover:bg-gray-50 transition-colors">
          ← Back
        </button>
        <button onClick={onContinue}
          className="flex-1 py-3.5 bg-[#1a4a3a] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#143d30] transition-colors">
          Proceed to Payment →
        </button>
      </div>
    </div>
  )
}

// ── Step 3: Payment ────────────────────────────────────────────────────────────

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
  const hasCareer = cartItems.some(i => i.type === 'career')

  const [step,     setStep]     = useState<Step>(1)
  const [upsells,  setUpsells]  = useState<UpsellItem[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [paying,   setPaying]   = useState(false)
  const [error,    setError]    = useState('')

  const [shipping, setShipping] = useState<ShippingAddress>({
    firstName: '', lastName: '', email: '',
    addressLine1: '', addressLine2: '', city: '', postalCode: '', country: 'IT',
  })

  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '' })

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

  function toggleUpsell(item: UpsellItem) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
      return next
    })
  }

  const selectedUpsells = upsells.filter(u => selected.has(u.id))
  const totalCents = cartTotal + selectedUpsells.reduce((s, u) => s + (u.price_cents ?? 0), 0)

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

  function validateContact(): string {
    if (!contact.firstName.trim()) return 'First name is required.'
    if (!contact.lastName.trim())  return 'Last name is required.'
    if (!contact.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))
      return 'A valid email is required.'
    return ''
  }

  function handleStep2Continue() {
    const err = hasMerch ? validateShipping() : validateContact()
    if (err) { setError(err); return }
    setError('')
    setStep(3)
  }

  // Derive customer name and email depending on which step 2 form was used
  function getCustomerInfo() {
    if (hasMerch) {
      return {
        name:  `${shipping.firstName} ${shipping.lastName}`.trim(),
        email: shipping.email,
      }
    }
    return {
      name:  `${contact.firstName} ${contact.lastName}`.trim(),
      email: contact.email,
    }
  }

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
          type:        'ticket' as const,
          referenceId: item.eventId ?? item.cartKey,
          name:        item.name,
          priceCents:  item.priceCents,
          quantity:    item.quantity,
          eventDate:   item.eventDate,
          eventLocation: item.eventLocation ?? undefined,
        })),
        ...cartItems.filter(i => i.type === 'career').map(item => ({
          type:        'career' as const,
          referenceId: item.serviceSlug ?? item.cartKey,
          name:        item.name,
          priceCents:  item.priceCents,
          quantity:    item.quantity,
        })),
        ...selectedUpsells.map(u => ({
          type:        'merch' as const,
          referenceId: u.referenceId,
          name:        u.name,
          priceCents:  u.price_cents ?? 0,
          quantity:    1,
        })),
      ]

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: lineItems,
          customerName,
          customerEmail,
          shippingAddress: hasMerch ? shipping : null,
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

  const backLabel = hasCareer && !hasMerch && !hasTicket ? '← Back to Career Service'
    : hasTicket && !hasMerch && !hasCareer ? '← Back to Events'
    : '← Back to Shop'
  const backHref = hasCareer && !hasMerch && !hasTicket ? '/career-service'
    : hasTicket && !hasMerch && !hasCareer ? '/events'
    : '/merch'

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Left — branding panel (desktop only, mirrors /login) */}
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
            <Stepper step={step} hasMerch={hasMerch} />

            {step === 1 && (
              <StepOrder
                cartItems={cartItems}
                upsells={upsells}
                selected={selected}
                onToggleUpsell={toggleUpsell}
                totalCents={totalCents}
                onContinue={() => { setError(''); setStep(2) }}
              />
            )}
            {step === 2 && hasMerch && (
              <StepShipping
                shipping={shipping}
                onChange={(f, v) => setShipping(prev => ({ ...prev, [f]: v }))}
                onBack={() => { setError(''); setStep(1) }}
                onContinue={handleStep2Continue}
                error={error}
              />
            )}
            {step === 2 && !hasMerch && (
              <StepContact
                contact={contact}
                onChange={(f, v) => setContact(prev => ({ ...prev, [f]: v }))}
                onBack={() => { setError(''); setStep(1) }}
                onContinue={handleStep2Continue}
                error={error}
              />
            )}
            {step === 3 && (
              <StepPayment
                totalCents={totalCents}
                shipping={shipping}
                hasMerch={hasMerch}
                onBack={() => { setError(''); setStep(2) }}
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
