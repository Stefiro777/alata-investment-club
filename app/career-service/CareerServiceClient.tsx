'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Reveal from '../components/Reveal'
import { createClient } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js'
import BookingCart, { type CartItem } from '../components/career/BookingCart'

// Initialise once at module level — guard against missing key at runtime
const stripeKey     = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

// ── Constants (identical to original page) ────────────────────────────────────

const LINKTREE_URL = 'https://linktr.ee/alatainvestmentclub'

const masterServices = [
  {
    number: '01',
    title: 'Master Orientation',
    description:
      "Personalized guidance to identify the right master's programs based on your profile, goals, and target schools. We help you build a compelling application strategy.",
  },
  {
    number: '02',
    title: 'GMAT / IELTS Prep',
    description:
      'Structured preparation sessions for GMAT and IELTS, focused on your weak areas. Get actionable feedback and a tailored study plan from members with first-hand experience.',
  },
  {
    number: '03',
    title: 'Finance Technicals',
    description:
      'Hands-on training in financial modelling, accounting fundamentals, and valuation — the core skills expected in finance internships and graduate roles.',
  },
]

const careerServices = [
  {
    number: '01',
    title: 'Career Orientation',
    description:
      'One-on-one sessions to map your career path in finance. We help you define your target roles, sectors, and firms, and build a realistic action plan.',
  },
  {
    number: '02',
    title: 'Interview Prep',
    description:
      'Mock interviews and technical drills tailored to investment banking, consulting, and asset management recruitment processes. Real questions, real feedback.',
  },
  {
    number: '03',
    title: 'CV / Cover Letter Review',
    description:
      'Expert review of your CV and cover letter with detailed written feedback and a revised version. Aligned with the standards of top financial firms.',
  },
]

// ── Types ─────────────────────────────────────────────────────────────────────

type Slot = { date: string; time: string; available: boolean }
type ServiceInfo = { id: string; name: string; price_cents: number; duration_minutes: number | null }

// ── Calendar helpers ──────────────────────────────────────────────────────────

const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

/** Returns Mon=0 … Sun=6 offset for the first day of the given month. */
function firstDayOffset(year: number, month: number): number {
  const jsDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function formatDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function formatEuros(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a4a3a] bg-white'
const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5'

// ── Step 3 Payment Form (must be inside <Elements>) ───────────────────────────

type BookingForm = {
  name: string
  email: string
  motivation: string
  goal: string
  cvUrl: string | null
}

function PaymentForm({
  service,
  slot,
  form,
  isMember,
  authToken,
  extraItems,
  onSuccess,
}: {
  service: ServiceInfo
  slot: { date: string; time: string }
  form: BookingForm
  isMember: boolean
  authToken: string | null
  extraItems: CartItem[]
  onSuccess: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    console.log('[Stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', stripeKey || 'UNDEFINED/EMPTY')
    console.log('[Stripe] stripe instance:', stripe)
  }, [stripe])

  const isFree      = isMember || service.price_cents === 0
  const extrasTotal = extraItems.reduce((s, e) => s + e.price_cents, 0)
  const totalCents  = (isFree ? 0 : service.price_cents) + extrasTotal

  async function handleConfirm() {
    if (processing) return
    setProcessing(true); setError(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`

      const res = await fetch('/api/career/book', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          service_id:  service.id,
          slot_date:   slot.date,
          slot_time:   slot.time,
          name:        form.name,
          email:       form.email,
          motivation:  form.motivation,
          goal:        form.goal,
          cv_url:      form.cvUrl ?? undefined,
          extra_items: extraItems.length > 0 ? extraItems : undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Booking failed'); setProcessing(false); return }

      if (isFree) { onSuccess(); return }

      // Paid path — confirm card payment with Stripe
      if (!stripe || !elements) { setError('Stripe not loaded'); setProcessing(false); return }
      const cardEl = elements.getElement(CardNumberElement)
      if (!cardEl) { setError('Card element not found'); setProcessing(false); return }

      const { error: stripeErr } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: { card: cardEl },
      })
      if (stripeErr) { setError(stripeErr.message ?? 'Payment failed'); setProcessing(false); return }

      onSuccess()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="border border-gray-200 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Booking Summary</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{service.name}</span>
            <span className={`font-semibold ${isMember ? 'line-through text-gray-300' : 'text-gray-900'}`}>
              {service.price_cents === 0 ? 'Free' : formatEuros(service.price_cents)}
            </span>
          </div>
          <p className="text-xs text-gray-400">{formatDateLong(slot.date)} at {slot.time}</p>
          {extraItems.map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs text-gray-500">
              <span>+ {e.label}</span>
              <span>{formatEuros(e.price_cents)}</span>
            </div>
          ))}
          {(extraItems.length > 0 || !isFree) && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100 mt-1">
              <span className="font-semibold text-gray-700">Total</span>
              <span className="font-bold text-gray-900">{totalCents === 0 ? 'Free' : formatEuros(totalCents)}</span>
            </div>
          )}
        </div>

        {/* Member badge */}
        {isMember && (
          <div className="mt-4 flex items-center gap-3 bg-[#1a4a3a]/5 border border-[#1a4a3a]/20 px-4 py-3">
            <svg className="w-4 h-4 text-[#1a4a3a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a]">Member Benefit — Free Session</p>
              <p className="text-xs text-gray-500 mt-0.5">€0,00</p>
            </div>
          </div>
        )}
      </div>

      {/* Card input */}
      {!isFree && (
        !stripeKey ? (
          <p className="text-sm text-red-600 border-l-2 border-red-400 pl-3">
            Payment unavailable — please contact us to book.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Card Number */}
            <div>
              <p className={labelCls}>Card Number</p>
              <div className="border border-gray-200 px-3" style={{ paddingTop: 12, paddingBottom: 12 }}>
                <CardNumberElement
                  options={{
                    style: {
                      base: { fontSize: '14px', color: '#1a1a1a', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#9ca3af' } },
                      invalid: { color: '#ef4444' },
                    },
                  }}
                />
              </div>
            </div>
            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className={labelCls}>Expiry Date</p>
                <div className="border border-gray-200 px-3" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <CardExpiryElement
                    options={{
                      style: {
                        base: { fontSize: '14px', color: '#1a1a1a', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#9ca3af' } },
                        invalid: { color: '#ef4444' },
                      },
                    }}
                  />
                </div>
              </div>
              <div>
                <p className={labelCls}>CVC</p>
                <div className="border border-gray-200 px-3" style={{ paddingTop: 12, paddingBottom: 12 }}>
                  <CardCvcElement
                    options={{
                      style: {
                        base: { fontSize: '14px', color: '#1a1a1a', fontFamily: 'Inter, sans-serif', '::placeholder': { color: '#9ca3af' } },
                        invalid: { color: '#ef4444' },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {error && (
        <p className="text-xs text-red-600 border-l-2 border-red-400 pl-3">{error}</p>
      )}

      <button
        onClick={handleConfirm}
        disabled={processing || (!isFree && !stripe)}
        className="w-full bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors disabled:opacity-40"
      >
        {processing
          ? 'Processing…'
          : (isFree && extrasTotal === 0)
            ? 'Confirm Booking'
            : `Pay ${formatEuros(totalCents)} & Confirm`}
      </button>
    </div>
  )
}

// ── Booking Overlay ───────────────────────────────────────────────────────────

function BookingOverlay({
  serviceTitle,
  onClose,
}: {
  serviceTitle: string
  onClose: () => void
}) {
  const [step, setStep]           = useState<1 | 2 | 3 | 4>(1)
  const [confirmed, setConfirmed] = useState(false)
  const [cartExtras, setCartExtras] = useState<CartItem[]>([])

  // Service discovery
  const [service, setService]           = useState<ServiceInfo | null>(null)
  const [serviceError, setServiceError] = useState<string | null>(null)

  // Auth
  const [isMember,          setIsMember]          = useState(false)
  const [membershipExpired, setMembershipExpired]  = useState(false)
  const [authToken,         setAuthToken]          = useState<string | null>(null)

  // Calendar / slot state
  const today      = new Date()
  const todayStr   = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [slots, setSlots]         = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Form
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [motivation, setMotivation] = useState('')
  const [goal, setGoal]           = useState('')
  const [cvUrl, setCvUrl]         = useState<string | null>(null)
  const [cvFilename, setCvFilename] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Discover service + check auth
  useEffect(() => {
    async function init() {
      const supabase = createClient()

      // Find matching service — try exact name first, then partial
      const { data: exact } = await supabase
        .from('career_services')
        .select('id, name, price_cents, duration_minutes')
        .ilike('name', serviceTitle)
        .eq('active', true)
        .limit(1)

      if (exact?.length) {
        setService(exact[0] as ServiceInfo)
      } else {
        const { data: all } = await supabase
          .from('career_services')
          .select('id, name, price_cents, duration_minutes')
          .eq('active', true)
        const list = (all ?? []) as ServiceInfo[]
        const word = serviceTitle.split(' ')[0].toLowerCase()
        const match = list.find(s => s.name.toLowerCase().includes(word))
        if (match) {
          setService(match)
        } else {
          setServiceError('This service is not yet available for online booking.')
        }
      }

      // Auth + member check
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setAuthToken(session.access_token)
      const { data: member } = await supabase
        .from('club_members')
        .select('id, membership_expires_at')
        .eq('email', session.user.email ?? '')
        .maybeSingle()
      if (member) {
        setIsMember(true)
        const expired = member.membership_expires_at
          ? new Date(member.membership_expires_at) < new Date()
          : true
        if (expired) setMembershipExpired(true)
      }
    }
    init()
  }, [serviceTitle])

  // Fetch slots when service or month changes
  useEffect(() => {
    if (!service) return
    setLoadingSlots(true)
    setSelectedDate(null)
    setSelectedTime(null)
    fetch(`/api/career/slots?service_id=${service.id}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => { setSlots(data.slots ?? []); setLoadingSlots(false) })
      .catch(() => setLoadingSlots(false))
  }, [service, year, month])

  // Calendar computations
  const offset      = firstDayOffset(year, month)
  const totalDays   = daysInMonth(year, month)
  const availDates  = new Set(slots.filter(s => s.available).map(s => s.date))
  const timesForDay = selectedDate ? slots.filter(s => s.date === selectedDate && s.available) : []

  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth() + 1

  function prevMonth() {
    if (isPrevDisabled) return
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
  }

  async function handleCvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadError(null)
    const fd = new FormData()
    fd.append('cv', file)
    const res = await fetch('/api/career/upload-cv', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok) { setUploadError(data.error ?? 'Upload failed'); setUploading(false); return }
    setCvUrl(data.url)
    setCvFilename(file.name)
    setUploading(false)
  }

  function removeCv() {
    setCvUrl(null); setCvFilename(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const canContinueStep1 = !!selectedDate && !!selectedTime
  const canContinueStep2 = name.trim() && email.trim() && motivation.trim() && goal.trim()

  const stepLabel = confirmed ? 'Booking Confirmed'
    : step === 1 ? 'Pick a Slot'
    : step === 2 ? 'Your Details'
    : step === 3 ? 'Your Cart'
    : 'Confirm Booking'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl"
        style={{ fontFamily: 'Inter, sans-serif' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200 flex-shrink-0">
          <div>
            {service && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] mb-0.5">
                {service.name}
              </p>
            )}
            <h2 className="font-serif text-xl font-bold text-gray-900">{stepLabel}</h2>
          </div>
          <div className="flex items-center gap-4">
            {/* Step dots */}
            {!confirmed && !serviceError && (
              <div className="flex items-center gap-1.5">
                {([1, 2, 3, 4] as const).map(n => (
                  <span key={n}
                    className="w-2 h-2 rounded-full transition-colors"
                    style={{ background: step >= n ? '#1a4a3a' : '#e5e7eb' }}
                  />
                ))}
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-7 py-6">

          {/* Service unavailable */}
          {serviceError && (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500">{serviceError}</p>
              <p className="text-xs text-gray-400 mt-2">Please contact us directly to book this service.</p>
            </div>
          )}

          {/* ── STEP 1: Calendar ── */}
          {!serviceError && !confirmed && step === 1 && (
            <div>
              {/* Month navigator */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} disabled={isPrevDisabled}
                  className="p-1.5 text-gray-400 hover:text-[#1a4a3a] transition-colors disabled:opacity-25">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-semibold uppercase tracking-widest text-gray-900">
                  {MONTHS[month - 1]} {year}
                </span>
                <button onClick={nextMonth}
                  className="p-1.5 text-gray-400 hover:text-[#1a4a3a] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400 py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {loadingSlots ? (
                <div className="h-44 flex items-center justify-center">
                  <p className="text-sm text-gray-400">Loading availability…</p>
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {/* Leading empty cells */}
                  {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                  {/* Day cells */}
                  {Array.from({ length: totalDays }).map((_, i) => {
                    const day     = i + 1
                    const dateStr = toDateStr(year, month, day)
                    const isPast  = dateStr < todayStr
                    const hasSlot = availDates.has(dateStr)
                    const isSel   = selectedDate === dateStr

                    return (
                      <div key={day} className="flex flex-col items-center py-1 relative">
                        <button
                          type="button"
                          disabled={isPast || !hasSlot}
                          onClick={() => { setSelectedDate(dateStr); setSelectedTime(null) }}
                          className="w-9 h-9 text-sm transition-colors"
                          style={{
                            background: isSel ? '#1a4a3a' : 'transparent',
                            color: isSel ? '#fff' : isPast || !hasSlot ? '#d1d5db' : '#111827',
                            cursor: isPast || !hasSlot ? 'default' : 'pointer',
                          }}
                          onMouseEnter={e => { if (!isPast && hasSlot && !isSel) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(26,74,58,0.08)' }}
                          onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                        >
                          {day}
                        </button>
                        {/* Green dot indicator */}
                        {hasSlot && !isPast && (
                          <span className="absolute bottom-0 w-1 h-1 rounded-full"
                            style={{ background: isSel ? '#fff' : '#1a4a3a' }} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Time pills */}
              {selectedDate && !loadingSlots && (
                <div className="mt-5 pt-5 border-t border-gray-200">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  {timesForDay.length === 0 ? (
                    <p className="text-sm text-gray-400">No available times for this date.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {timesForDay.map(s => (
                        <button
                          key={s.time}
                          type="button"
                          onClick={() => setSelectedTime(s.time)}
                          className="px-4 py-2 text-sm font-medium border transition-colors"
                          style={{
                            background: selectedTime === s.time ? '#1a4a3a' : '#fff',
                            color: selectedTime === s.time ? '#fff' : '#374151',
                            borderColor: selectedTime === s.time ? '#1a4a3a' : '#e5e7eb',
                          }}
                        >
                          {s.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Details ── */}
          {!serviceError && !confirmed && step === 2 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name *</label>
                <input value={name} onChange={e => setName(e.target.value)}
                  placeholder="Your full name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>What prompted you to book this session? *</label>
                <textarea rows={3} value={motivation} onChange={e => setMotivation(e.target.value)}
                  placeholder="Tell us what brought you here…"
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>What would you like to achieve from this session? *</label>
                <textarea rows={3} value={goal} onChange={e => setGoal(e.target.value)}
                  placeholder="Share your goals for this session…"
                  className={`${inputCls} resize-none`} />
              </div>
              {/* CV upload */}
              <div>
                <label className={labelCls}>CV / Cover Letter (optional — PDF or DOCX, max 5MB)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleCvUpload}
                />
                {cvFilename ? (
                  <div className="flex items-center gap-3 border border-[#1a4a3a]/30 bg-[#f9f9f8] px-4 py-3">
                    <svg className="w-4 h-4 text-[#1a4a3a] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{cvFilename}</span>
                    <button type="button" onClick={removeCv}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 border border-dashed border-gray-300 px-4 py-3 w-full text-sm text-gray-500 transition-colors disabled:opacity-40"
                    style={{ transition: 'border-color 0.2s, color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1a4a3a'; (e.currentTarget as HTMLButtonElement).style.color = '#1a4a3a' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#d1d5db'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280' }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploading ? 'Uploading…' : 'Upload PDF or DOCX'}
                  </button>
                )}
                {uploadError && (
                  <p className="mt-1 text-xs text-red-600">{uploadError}</p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Cart ── */}
          {!serviceError && !confirmed && step === 3 && service && selectedDate && selectedTime && (
            <>
              {isMember && membershipExpired && (
                <div className="mb-4 flex items-center justify-between gap-3 border border-yellow-300 bg-yellow-50 px-4 py-3">
                  <p className="text-xs text-yellow-800">
                    Rinnova la membership per accedere ai prezzi riservati.
                  </p>
                  <a
                    href="/dashboard/membership"
                    className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] underline"
                  >
                    Rinnova →
                  </a>
                </div>
              )}
              <BookingCart
                serviceName={service.name}
                servicePrice={service.price_cents}
                isMember={isMember && !membershipExpired}
                slot={{ date: selectedDate, time: selectedTime }}
                formatDate={formatDateLong}
                onProceed={(extras) => { setCartExtras(extras); setStep(4) }}
                onBack={() => setStep(2)}
              />
            </>
          )}

          {/* ── STEP 4: Payment ── */}
          {!serviceError && !confirmed && step === 4 && service && selectedDate && selectedTime && (
            <PaymentForm
              service={service}
              slot={{ date: selectedDate, time: selectedTime }}
              form={{ name, email, motivation, goal, cvUrl }}
              isMember={isMember && !membershipExpired}
              authToken={authToken}
              extraItems={cartExtras}
              onSuccess={() => setConfirmed(true)}
            />
          )}

          {/* ── Confirmation screen ── */}
          {confirmed && (
            <div className="flex flex-col items-center text-center py-10">
              <div className="flex items-center justify-center w-16 h-16 mb-6"
                style={{ background: '#1a4a3a' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl font-bold text-gray-900 mb-2">Booking Confirmed</h3>
              {service && (
                <p className="text-sm font-medium text-gray-700 mb-1">{service.name}</p>
              )}
              {selectedDate && selectedTime && (
                <p className="text-sm text-gray-400 mb-6">{formatDateLong(selectedDate)} at {selectedTime}</p>
              )}
              <p className="text-sm text-gray-500 mb-8 max-w-xs">
                A confirmation email has been sent to{' '}
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <button
                onClick={onClose}
                className="border text-xs font-semibold uppercase tracking-widest px-8 py-3 transition-colors"
                style={{ borderColor: '#1a4a3a', color: '#1a4a3a' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a4a3a'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#1a4a3a' }}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* ── Footer navigation ── */}
        {!confirmed && !serviceError && (step === 1 || step === 2) && (
          <div className="flex items-center justify-between px-7 py-5 border-t border-gray-200 flex-shrink-0">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => (s - 1) as 1 | 2)}
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={() => setStep(s => (s + 1) as 2 | 3)}
              disabled={step === 1 ? !canContinueStep1 : !canContinueStep2}
              className="text-xs font-semibold uppercase tracking-widest px-8 py-3 transition-colors disabled:opacity-40"
              style={{ background: '#1a4a3a', color: '#fff' }}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ServiceSubCard (opens BookingOverlay) ────────────────────────────────────

function ServiceSubCard({ number, title, description }: { number: string; title: string; description: string }) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const closeOverlay = useCallback(() => setOverlayOpen(false), [])

  return (
    <>
      <div
        className="relative overflow-hidden p-6 sm:p-8 flex flex-col h-full"
        style={{ background: '#ffffff', borderTop: '2px solid #1a4a3a' }}
      >
        <span
          className="absolute -bottom-4 -right-2 font-serif font-bold leading-none select-none pointer-events-none"
          style={{ fontSize: '7rem', color: '#1a4a3a', opacity: 0.05 }}
          aria-hidden="true"
        >
          {number}
        </span>

        <div className="mb-4 relative">
          <p className="text-xs tracking-[0.2em] uppercase mb-2" style={{ color: '#1a4a3a', opacity: 0.6 }}>{number}</p>
          <h3 className="font-serif text-xl font-medium text-ink-900">{title}</h3>
          <div className="w-6 h-px mt-3" style={{ background: '#1a4a3a' }} />
        </div>

        <p className="text-ink-500 text-sm leading-relaxed flex-1 relative">{description}</p>

        <div className="mt-auto pt-6">
          <button
            onClick={() => setOverlayOpen(true)}
            className="inline-flex items-center gap-2 border border-forest text-forest text-sm font-medium tracking-wide py-2 px-5 transition-colors hover:bg-forest hover:text-white"
          >
            Book Now
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>

      {overlayOpen && stripePromise && (
        <Elements stripe={stripePromise}>
          <BookingOverlay serviceTitle={title} onClose={closeOverlay} />
        </Elements>
      )}
      {overlayOpen && !stripePromise && (
        <BookingOverlay serviceTitle={title} onClose={closeOverlay} />
      )}
    </>
  )
}

// ── Full page content (mirrors original page.tsx exactly) ─────────────────────

export default function CareerServiceClient() {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Image src="/vittoria.jpeg" alt="" fill className="object-cover object-top grayscale" priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="animate-hero-line text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Professional support</p>
            <h1 className="animate-hero-title font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Career Service
            </h1>
            <div className="animate-hero-line w-12 h-px bg-white/30 mb-6" />
            <p
              className="text-white/70 text-base max-w-2xl leading-relaxed"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}
            >
              Services designed to accelerate your career in finance — from university orientation to landing your first role in the industry.
            </p>
          </div>
        </div>
      </section>

      {/* Two service windows */}
      <section className="py-20 sm:py-28 bg-[#f5f5f0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col gap-8">

            {/* Window 1: Master & Education */}
            <Reveal delay={0} direction="up">
              <div className="flex flex-col h-full" style={{ border: '2px solid #1a4a3a' }}>
                <div className="px-10 py-8" style={{ background: '#1a4a3a' }}>
                  <h2 className="font-serif text-4xl sm:text-5xl font-normal uppercase text-white tracking-widest">
                    Master &amp; Education
                  </h2>
                  <div className="w-full border-b border-white/20 my-4" />
                  <p className="text-sm italic text-white/70">
                    Academic guidance and technical preparation for top programs
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-6 p-6">
                  {masterServices.map((service, i) => (
                    <Reveal key={service.number} delay={i * 100} direction="up">
                      <ServiceSubCard {...service} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Window 2: Career */}
            <Reveal delay={150} direction="up">
              <div className="flex flex-col h-full" style={{ border: '2px solid #1a4a3a' }}>
                <div className="px-10 py-8" style={{ background: '#1a4a3a' }}>
                  <h2 className="font-serif text-4xl sm:text-5xl font-normal uppercase text-white tracking-widest">
                    Career
                  </h2>
                  <div className="w-full border-b border-white/20 my-4" />
                  <p className="text-sm italic text-white/70">
                    End-to-end support for your professional journey in finance
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-6 p-6">
                  {careerServices.map((service, i) => (
                    <Reveal key={service.number} delay={i * 100} direction="up">
                      <ServiceSubCard {...service} />
                    </Reveal>
                  ))}
                </div>
              </div>
            </Reveal>

          </div>
        </div>
      </section>

      {/* Linktree CTA */}
      <section className="py-20 bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">Follow us</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">
              All our links in one place
            </h2>
            <p className="text-ink-500 text-sm leading-relaxed mb-10">
              Follow Alata Investment Club on social media, access our resources, and stay updated on our activities.
            </p>
            <a
              href={LINKTREE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide px-10 py-4 transition-colors duration-fast"
            >
              Visit our Linktree
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
