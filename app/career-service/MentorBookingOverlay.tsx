'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase'
import BookingCart, { type CartItem } from '../components/career/BookingCart'
import { PaymentForm } from './PaymentForm'
import { MONTHS, WEEKDAYS, daysInMonth, firstDayOffset, toDateStr, formatDateLong, formatEuros } from './calendarUtils'

const stripeKey     = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

type Mentor = {
  id: string
  full_name: string
  role_title?: string | null
  bio_long?: string | null
  /** The mentor has availability: only then can a session be booked online. */
  bookable: boolean
}

type Slot = { date: string; time: string; available: boolean }

/** Answer of /api/career/pricing: what THIS visitor pays, computed server-side. */
type Pricing = {
  price_cents: number
  duration_minutes: number
  is_member: boolean
  membership_inactive: boolean
  effective_price_cents: number
}

function MentorBookingOverlayInner({
  mentor,
  onClose,
  onSwitchMentor,
}: {
  mentor: Mentor
  onClose: () => void
  onSwitchMentor?: (mentorId: string) => void
}) {
  const [step, setStep]           = useState<1 | 2 | 3 | 4>(1)
  const [confirmed, setConfirmed] = useState(false)
  const [cartExtras, setCartExtras] = useState<CartItem[]>([])

  // Price/duration for this visitor — one price for every session, free for active members
  const [pricing, setPricing]               = useState<Pricing | null>(null)
  const [loadingPricing, setLoadingPricing] = useState(true)

  // Auth
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const isMember          = !!pricing && pricing.is_member && !pricing.membership_inactive
  const membershipExpired = !!pricing?.membership_inactive
  const sessionName       = `Career session with ${mentor.full_name}`

  // Calendar / slot state
  const today      = new Date()
  const todayStr   = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate())
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [slots, setSlots]               = useState<Slot[]>([])
  // Month whose slots are loaded; the month on screen is loading until they match.
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  // Form
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [motivation, setMotivation] = useState('')
  const [goal, setGoal]             = useState('')
  const [cvUrl, setCvUrl]           = useState<string | null>(null)
  const [cvFilename, setCvFilename] = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setAuthToken(session?.access_token ?? null)
      setAuthReady(true)
    }
    init()
  }, [])

  // The member price is computed on the server from the visitor's session.
  useEffect(() => {
    if (!authReady) return
    // loadingPricing starts true; the token is read once, so this runs once.
    fetch('/api/career/pricing', { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} })
      .then(r => r.json())
      .then(data => { setPricing(data.error ? null : (data as Pricing)); setLoadingPricing(false) })
      .catch(() => setLoadingPricing(false))
  }, [authReady, authToken])

  // Fetch slots when the month changes.
  useEffect(() => {
    if (!mentor.bookable) return
    const key = `${year}-${month}`
    fetch(`/api/career/slots?mentor_id=${mentor.id}&year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => { setSlots(data.slots ?? []); setLoadedMonth(key) })
      .catch(() => { setSlots([]); setLoadedMonth(key) })
  }, [mentor.bookable, mentor.id, year, month])

  const loadingSlots = mentor.bookable && loadedMonth !== `${year}-${month}`
  const offset      = firstDayOffset(year, month)
  const totalDays    = daysInMonth(year, month)
  const availDates  = new Set(slots.filter(s => s.available).map(s => s.date))
  const timesForDay = selectedDate ? slots.filter(s => s.date === selectedDate && s.available) : []
  const isPrevDisabled = year === today.getFullYear() && month === today.getMonth() + 1

  function prevMonth() {
    if (isPrevDisabled) return
    setSelectedDate(null); setSelectedTime(null)
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    setSelectedDate(null); setSelectedTime(null)
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
    setCvUrl(data.path)
    setCvFilename(file.name)
    setUploading(false)
  }

  function removeCv() {
    setCvUrl(null); setCvFilename(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const canContinueStep1 = !!selectedDate && !!selectedTime
  const canContinueStep2 = name.trim() && email.trim() && motivation.trim() && goal.trim()
  const priceText = pricing
    ? `${pricing.duration_minutes} min · ${pricing.price_cents > 0 ? formatEuros(pricing.price_cents).replace(',00', '') : 'Free'}${pricing.price_cents > 0 ? ' · free for members' : ''}`
    : null
  const fieldCls = 'rd-field text-ivory'
  const labelText = 'block text-[13px] text-ivory/75'
  const ctaCls = 'rd-italic text-[clamp(34px,3.7vw,44px)] hover:underline underline-offset-[0.18em] disabled:opacity-35 disabled:no-underline'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Book a session with ${mentor.full_name}`}
      className="fixed inset-0 z-[150] overflow-y-auto bg-night text-ivory"
    >
      <div className="rd-gutter flex items-center justify-between pt-6 md:pt-[30px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/redesign/logo-light.png" alt="Alata" className="h-[34px] w-auto md:h-10" />
        <button type="button" onClick={onClose} className="text-[13px] font-medium tracking-[0.04em] hover:underline underline-offset-[6px]">
          Close
        </button>
      </div>

      <div className="rd-gutter pb-16 pt-[clamp(32px,6vw,50px)]">
        {confirmed ? (
          <div className="max-w-[640px] py-10">
            <div className="text-[13px] text-ivory/75">{sessionName}</div>
            <h2 className="rd-display mt-2 text-[clamp(44px,5vw,64px)]">You are <em>booked.</em></h2>
            {selectedDate && selectedTime && <p className="mt-4 text-[16px] text-ivory/85">{formatDateLong(selectedDate)} at {selectedTime}</p>}
            <p className="mt-3 text-[14px] text-ivory/70">A confirmation email has been sent to {email}.</p>
            <button type="button" onClick={onClose} className={`${ctaCls} mt-10`}>Back to the mentors</button>
          </div>
        ) : step === 1 ? (
          <div className="grid gap-12 lg:grid-cols-[minmax(0,420px)_minmax(0,544px)] lg:justify-between">
            <div>
              <div className="text-[13px] text-ivory/75">Your session with {mentor.full_name}</div>
              <h2 className="rd-display mt-2 text-[clamp(40px,4.7vw,56px)]">{mentor.role_title || 'Career session'}</h2>
              {priceText && <div className="mt-3 text-[14px] text-ivory/85">{priceText}</div>}
              {pricing && isMember && pricing.effective_price_cents === 0 && pricing.price_cents > 0 && (
                <div className="mt-1 text-[13px] text-ivory/70">Free for you: member benefit.</div>
              )}
              {mentor.bio_long && <p className="mt-6 text-[14px] leading-[1.7] text-ivory/80">{mentor.bio_long}</p>}

              {mentor.bookable && (
                <div className="mt-12">
                  <div className="text-[13px] text-ivory/75">
                    {selectedDate
                      ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
                      : 'Choose a day in the calendar'}
                  </div>
                  {selectedDate && !loadingSlots && (
                    timesForDay.length === 0 ? (
                      <p className="mt-3 text-[13px] text-ivory/60">No free times on this day.</p>
                    ) : (
                      <div className="mt-3.5 flex flex-wrap gap-2.5">
                        {timesForDay.map(s => (
                          <button
                            key={s.time}
                            type="button"
                            onClick={() => setSelectedTime(s.time)}
                            aria-pressed={selectedTime === s.time}
                            className={`rounded-full border px-5 py-2.5 text-[13px] font-medium transition-colors ${selectedTime === s.time ? 'border-ivory bg-ivory text-night' : 'border-ivory/50 hover:border-ivory'}`}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canContinueStep1 || loadingPricing || !pricing}
                    className={`${ctaCls} mt-10 block`}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>

            <div>
              {!mentor.bookable ? (
                <p className="rd-italic text-[28px] text-ivory/70">Not yet available for online booking.</p>
              ) : (
                <>
                  <div className="mb-[22px] flex items-baseline justify-between">
                    <div className="flex items-baseline gap-4">
                      <button type="button" onClick={prevMonth} disabled={isPrevDisabled} aria-label="Previous month" className="-m-2 p-2 text-[24px] text-ivory/70 hover:text-ivory disabled:opacity-25">‹</button>
                      <span className="rd-italic text-[clamp(34px,3.7vw,44px)]">{MONTHS[month - 1]}</span>
                      <button type="button" onClick={nextMonth} aria-label="Next month" className="-m-2 p-2 text-[24px] text-ivory/70 hover:text-ivory">›</button>
                    </div>
                    <span className="text-[13px] text-ivory/75">{year}</span>
                  </div>
                  <div className="grid grid-cols-7 gap-y-1.5">
                    {WEEKDAYS.map(d => (
                      <div key={d} className="text-center text-[11px] uppercase tracking-[0.1em] text-ivory/70">{d}</div>
                    ))}
                    {loadingSlots ? (
                      <div className="col-span-7 flex h-[260px] items-center justify-center text-[13px] text-ivory/60">Loading availability…</div>
                    ) : (
                      <>
                        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
                        {Array.from({ length: totalDays }).map((_, i) => {
                          const day = i + 1
                          const dateStr = toDateStr(year, month, day)
                          const free = dateStr >= todayStr && availDates.has(dateStr)
                          const sel = selectedDate === dateStr
                          return (
                            <button
                              key={day}
                              type="button"
                              disabled={!free}
                              onClick={() => { setSelectedDate(dateStr); setSelectedTime(null) }}
                              aria-pressed={sel}
                              aria-label={`${day} ${MONTHS[month - 1]}${free ? ', available' : ''}`}
                              className={`mx-1 flex h-[46px] items-center justify-center rounded-full font-serif text-[22px] font-medium transition-colors sm:mx-1.5 ${
                                sel ? 'bg-ivory text-night' : free ? 'border border-ivory/55 hover:border-ivory' : 'cursor-default text-ivory/35'
                              }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </>
                    )}
                  </div>
                  <div className="mt-[18px] text-[12px] text-ivory/70">Available days are outlined. Slots come from the Career team&apos;s availability.</div>
                </>
              )}
            </div>
          </div>
        ) : step === 2 ? (
          <div className="max-w-[720px]">
            <div className="text-[13px] text-ivory/75">{sessionName} · {selectedDate && formatDateLong(selectedDate)} at {selectedTime}</div>
            <h2 className="rd-display mt-2 text-[clamp(40px,4.7vw,56px)]">About <em>you</em></h2>
            <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
              <label className={labelText}>Full name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" className={fieldCls} /></label>
              <label className={labelText}>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className={fieldCls} /></label>
              <label className={`${labelText} sm:col-span-2`}>What prompted you to book this session?<textarea rows={2} value={motivation} onChange={e => setMotivation(e.target.value)} className={fieldCls} /></label>
              <label className={`${labelText} sm:col-span-2`}>What would you like to achieve from it?<textarea rows={2} value={goal} onChange={e => setGoal(e.target.value)} className={fieldCls} /></label>
              <div className="sm:col-span-2">
                <span className={labelText}>Your CV (PDF or DOCX, optional, max 5 MB)</span>
                <input ref={fileRef} type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden" onChange={handleCvUpload} />
                {cvFilename ? (
                  <div className="mt-2.5 flex items-center gap-4 text-[14px]">
                    <span className="min-w-0 truncate">{cvFilename}</span>
                    <button type="button" onClick={removeCv} className="text-[13px] text-ivory/70 underline underline-offset-4 hover:text-ivory">Remove</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="mt-2.5 rounded-full border border-ivory/50 px-5 py-2.5 text-[13px] font-medium hover:border-ivory disabled:opacity-40">
                    {uploading ? 'Uploading…' : 'Upload your CV'}
                  </button>
                )}
                {uploadError && <p role="alert" className="mt-2 text-[13px] text-[#f0b3a6]">{uploadError}</p>}
              </div>
            </div>
            <div className="mt-10 flex flex-wrap items-baseline gap-x-10 gap-y-4">
              <button type="button" onClick={() => setStep(3)} disabled={!canContinueStep2 || loadingPricing || !pricing} className={ctaCls}>
                Continue
              </button>
              <button type="button" onClick={() => setStep(1)} className="text-[13px] text-ivory/70 hover:text-ivory">Back</button>
            </div>
          </div>
        ) : (
          <div className="max-w-[640px]">
            <div className="text-[13px] text-ivory/75">{sessionName}</div>
            <h2 className="rd-display mt-2 text-[clamp(40px,4.7vw,56px)]">{step === 3 ? <>Your <em>cart</em></> : <>Book the <em>session</em></>}</h2>
            {isMember && membershipExpired && step === 3 && (
              <p className="mt-4 text-[14px] text-ivory/80">
                Renew your membership to get the member price. <a href="/dashboard/membership" className="underline underline-offset-4">Renew</a>
              </p>
            )}
            <div className="mt-8 bg-ivory p-[clamp(20px,3vw,32px)] text-night">
              {step === 3 && pricing && selectedDate && selectedTime && (
                <BookingCart
                  sessionName={sessionName}
                  sessionPrice={pricing.price_cents}
                  isMember={isMember}
                  mentorId={mentor.id}
                  authToken={authToken}
                  onSelectMentor={id => onSwitchMentor?.(id)}
                  slot={{ date: selectedDate, time: selectedTime }}
                  formatDate={formatDateLong}
                  onProceed={extras => { setCartExtras(extras); setStep(4) }}
                  onBack={() => setStep(2)}
                />
              )}
              {step === 4 && pricing && selectedDate && selectedTime && (
                stripePromise ? (
                  <Elements stripe={stripePromise}>
                    <PaymentForm
                      session={{ name: sessionName, price_cents: pricing.price_cents, effective_price_cents: pricing.effective_price_cents }}
                      slot={{ date: selectedDate, time: selectedTime }}
                      form={{ name, email, motivation, goal, cvUrl }}
                      isMember={isMember}
                      authToken={authToken}
                      extraItems={cartExtras}
                      mentorId={mentor.id}
                      onSuccess={() => setConfirmed(true)}
                    />
                  </Elements>
                ) : (
                  <p className="text-[14px] text-[#8a2a1d]">Payment unavailable: please contact us to book.</p>
                )
              )}
            </div>
            {step === 4 && (
              <button type="button" onClick={() => setStep(3)} className="mt-6 text-[13px] text-ivory/70 hover:text-ivory">Back</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MentorBookingOverlay(props: {
  mentor: Mentor
  onClose: () => void
  onSwitchMentor?: (mentorId: string) => void
}) {
  if (typeof document === 'undefined') return null
  return createPortal(<MentorBookingOverlayInner {...props} />, document.body)
}
