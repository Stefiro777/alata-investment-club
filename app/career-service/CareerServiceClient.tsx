'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Reveal from '../components/Reveal'
import Parallax from '../components/Parallax'
import { MotionReveal, MotionLine } from '../components/motion/Motion'
import { createClient } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import BookingCart, { type CartItem } from '../components/career/BookingCart'
import MentorSection from './MentorSection'
import { MONTHS, WEEKDAYS, daysInMonth, firstDayOffset, toDateStr, formatDateLong } from './calendarUtils'
import { PaymentForm, type ServiceInfo } from './PaymentForm'

// Initialise once at module level — guard against missing key at runtime
const stripeKey     = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

// ── Constants (identical to original page) ────────────────────────────────────

const LINKTREE_URL = 'https://linktr.ee/alatainvestmentclub'

// ── Types ─────────────────────────────────────────────────────────────────────

type Slot = { date: string; time: string; available: boolean }
type PublicService = {
  id: string
  name: string
  description: string | null
  section: 'master' | 'career'
  display_order: number
}

// ── Shared style tokens ───────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-forest bg-white'
const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5'

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
              <p className="text-[10px] font-semibold uppercase tracking-widest text-forest mb-0.5">
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors -m-3.5 p-3.5">
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
                  className="-m-3 p-3 text-gray-400 hover:text-forest transition-colors disabled:opacity-25">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-sm font-semibold uppercase tracking-widest text-gray-900">
                  {MONTHS[month - 1]} {year}
                </span>
                <button onClick={nextMonth}
                  className="-m-3 p-3 text-gray-400 hover:text-forest transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday labels */}
              <div className="grid grid-cols-7 -mx-3 mb-1">
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
                <div className="grid grid-cols-7 -mx-3">
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
                          className="w-full max-w-11 aspect-square mx-auto text-sm transition-colors"
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
                            style={{ background: isSel ? '#fff' : 'var(--forest)' }} />
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
                  <div className="flex items-center gap-3 border border-forest/30 bg-[#f9f9f8] px-4 py-3">
                    <svg className="w-4 h-4 text-forest flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-widest text-forest underline"
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
                style={{ background: 'var(--forest)' }}>
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
                style={{ borderColor: 'var(--forest)', color: 'var(--forest)' }}
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
              style={{ background: 'var(--forest)', color: '#fff' }}
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
      <div className="service-card group relative overflow-hidden bg-white border border-line-faint p-7 sm:p-9 flex flex-col h-full">
        {/* top accent line — a short segment that draws across on hover */}
        <span className="service-card-rule absolute top-0 left-0 h-[2px] bg-forest" aria-hidden="true" />

        {/* watermark numeral */}
        <span
          className="absolute -bottom-6 -right-2 font-serif font-bold leading-none select-none pointer-events-none text-forest/[0.05] transition-transform duration-500 group-hover:-translate-y-1"
          style={{ fontSize: '7rem' }}
          aria-hidden="true"
        >
          {number}
        </span>

        <div className="mb-5 relative">
          <p className="text-xs tracking-[0.25em] uppercase text-ink-400 mb-3">{number}</p>
          <h3 className="font-serif text-2xl font-medium text-ink-900 leading-snug">{title}</h3>
          <div className="w-8 h-px mt-4 bg-forest transition-[width] duration-500 group-hover:w-16" />
        </div>

        <p className="text-ink-500 text-sm leading-relaxed flex-1 relative">{description}</p>

        <div className="mt-auto pt-8">
          <button
            onClick={() => setOverlayOpen(true)}
            className="inline-flex items-center gap-2 text-forest text-xs font-semibold tracking-[0.18em] uppercase"
          >
            <span className="underline-grow">Book Now</span>
            <svg className="w-3.5 h-3.5 transition-transform duration-base group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
        </div>
      </div>

      {overlayOpen && stripePromise && createPortal(
        <Elements stripe={stripePromise}>
          <BookingOverlay serviceTitle={title} onClose={closeOverlay} />
        </Elements>,
        document.body
      )}
      {overlayOpen && !stripePromise && createPortal(
        <BookingOverlay serviceTitle={title} onClose={closeOverlay} />,
        document.body
      )}
    </>
  )
}

// ── Full page content (mirrors original page.tsx exactly) ─────────────────────

export default function CareerServiceClient() {
  const [services, setServices]               = useState<PublicService[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('career_services')
      .select('id, name, description, section, display_order')
      .eq('active', true)
      .order('section', { ascending: true })
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        setServices((data ?? []) as PublicService[])
        setLoadingServices(false)
      })
  }, [])

  const masterServices = services.filter(s => s.section === 'master')
  const careerServices = services.filter(s => s.section === 'career')

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Parallax>
          <Image src="/vittoria.jpeg" alt="" fill className="object-cover object-top grayscale animate-ken-burns" preload />
        </Parallax>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="absolute inset-0 hero-vignette" />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <MotionReveal delay={0} y={20}>
              <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Professional support</p>
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
                Career Service
              </h1>
            </MotionReveal>
            <MotionLine delay={0.35} duration={0.8} className="w-12 h-px bg-white/30 mb-6" />
            <MotionReveal delay={0.45}>
              <p className="text-white/70 text-base max-w-2xl leading-relaxed">
                Services designed to accelerate your career in finance — from university orientation to landing your first role in the industry.
              </p>
            </MotionReveal>
          </div>
        </div>
      </section>

      {/* Two service windows */}
      <section className="py-20 sm:py-28 bg-[#f5f5f0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col gap-8">

            {/* Window 1: Master & Education — hidden once loaded if no active services in this section */}
            {(loadingServices || masterServices.length > 0) && (
              <Reveal delay={0} direction="up">
                <div className="flex flex-col h-full" style={{ border: '2px solid #1a4a3a' }}>
                  <div className="px-10 py-8" style={{ background: 'var(--forest)' }}>
                    <h2 className="font-serif text-4xl sm:text-5xl font-normal uppercase text-white tracking-widest">
                      Master &amp; Education
                    </h2>
                    <div className="w-full border-b border-white/20 my-4" />
                    <p className="text-sm italic text-white/70">
                      Academic guidance and technical preparation for top programs
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-6 p-6">
                    {loadingServices ? (
                      <p className="col-span-full text-sm text-ink-500 py-6 text-center">Loading services…</p>
                    ) : (
                      masterServices.map((service, i) => (
                        <Reveal key={service.id} delay={i * 100} direction="up">
                          <ServiceSubCard
                            number={String(i + 1).padStart(2, '0')}
                            title={service.name}
                            description={service.description ?? ''}
                          />
                        </Reveal>
                      ))
                    )}
                  </div>
                </div>
              </Reveal>
            )}

            {/* Window 2: Career — hidden once loaded if no active services in this section */}
            {(loadingServices || careerServices.length > 0) && (
              <Reveal delay={150} direction="up">
                <div className="flex flex-col h-full" style={{ border: '2px solid #1a4a3a' }}>
                  <div className="px-10 py-8" style={{ background: 'var(--forest)' }}>
                    <h2 className="font-serif text-4xl sm:text-5xl font-normal uppercase text-white tracking-widest">
                      Career
                    </h2>
                    <div className="w-full border-b border-white/20 my-4" />
                    <p className="text-sm italic text-white/70">
                      End-to-end support for your professional journey in finance
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-6 p-6">
                    {loadingServices ? (
                      <p className="col-span-full text-sm text-ink-500 py-6 text-center">Loading services…</p>
                    ) : (
                      careerServices.map((service, i) => (
                        <Reveal key={service.id} delay={i * 100} direction="up">
                          <ServiceSubCard
                            number={String(i + 1).padStart(2, '0')}
                            title={service.name}
                            description={service.description ?? ''}
                          />
                        </Reveal>
                      ))
                    )}
                  </div>
                </div>
              </Reveal>
            )}

          </div>
        </div>
      </section>

      <MentorSection />

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
