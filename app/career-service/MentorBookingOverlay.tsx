'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { createClient } from '@/lib/supabase'
import BookingCart, { type CartItem } from '../components/career/BookingCart'
import { PaymentForm, type ServiceInfo } from './PaymentForm'
import { formatDateLong } from './calendarUtils'

const stripeKey     = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

const inputCls = 'w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-forest bg-white'
const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1.5'

type Mentor = { id: string; full_name: string }

function MentorBookingOverlayInner({
  mentor,
  service,
  slot,
  onClose,
}: {
  mentor: Mentor
  service: ServiceInfo
  slot: { date: string; time: string }
  onClose: () => void
}) {
  const [step, setStep]           = useState<2 | 3 | 4>(2)
  const [confirmed, setConfirmed] = useState(false)
  const [cartExtras, setCartExtras] = useState<CartItem[]>([])

  const [isMember, setIsMember]                   = useState(false)
  const [membershipExpired, setMembershipExpired]  = useState(false)
  const [authToken, setAuthToken]                  = useState<string | null>(null)

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
  }, [])

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

  const canContinueStep2 = name.trim() && email.trim() && motivation.trim() && goal.trim()
  const stepLabel = confirmed ? 'Booking Confirmed'
    : step === 2 ? 'Your Details'
    : step === 3 ? 'Your Cart'
    : 'Confirm Booking'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl" style={{ fontFamily: 'Inter, sans-serif' }}>

        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200 flex-shrink-0">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-forest mb-0.5">
              {mentor.full_name} — {service.name}
            </p>
            <h2 className="font-serif text-xl font-bold text-gray-900">{stepLabel}</h2>
          </div>
          <div className="flex items-center gap-4">
            {!confirmed && (
              <div className="flex items-center gap-1.5">
                {([2, 3, 4] as const).map(n => (
                  <span key={n} className="w-2 h-2 rounded-full transition-colors"
                    style={{ background: step >= n ? '#1a4a3a' : '#e5e7eb' }} />
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

        <div className="flex-1 overflow-y-auto px-7 py-6">

          {!confirmed && step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 mb-2">{formatDateLong(slot.date)} at {slot.time}</p>
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
                  placeholder="Tell us what brought you here…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>What would you like to achieve from this session? *</label>
                <textarea rows={3} value={goal} onChange={e => setGoal(e.target.value)}
                  placeholder="Share your goals for this session…" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className={labelCls}>CV / Cover Letter (optional — PDF or DOCX, max 5MB)</label>
                <input ref={fileRef} type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden" onChange={handleCvUpload} />
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
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 border border-dashed border-gray-300 px-4 py-3 w-full text-sm text-gray-500 transition-colors disabled:opacity-40">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {uploading ? 'Uploading…' : 'Upload PDF or DOCX'}
                  </button>
                )}
                {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
              </div>
            </div>
          )}

          {!confirmed && step === 3 && (
            <>
              {isMember && membershipExpired && (
                <div className="mb-4 flex items-center justify-between gap-3 border border-yellow-300 bg-yellow-50 px-4 py-3">
                  <p className="text-xs text-yellow-800">Rinnova la membership per accedere ai prezzi riservati.</p>
                  <a href="/dashboard/membership" className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-widest text-forest underline">
                    Rinnova →
                  </a>
                </div>
              )}
              <BookingCart
                serviceName={service.name}
                servicePrice={service.price_cents}
                isMember={isMember && !membershipExpired}
                slot={slot}
                formatDate={formatDateLong}
                onProceed={extras => { setCartExtras(extras); setStep(4) }}
                onBack={() => setStep(2)}
              />
            </>
          )}

          {!confirmed && step === 4 && (
            stripePromise ? (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  service={service}
                  slot={slot}
                  form={{ name, email, motivation, goal, cvUrl }}
                  isMember={isMember && !membershipExpired}
                  authToken={authToken}
                  extraItems={cartExtras}
                  mentorId={mentor.id}
                  onSuccess={() => setConfirmed(true)}
                />
              </Elements>
            ) : (
              <p className="text-sm text-red-600 border-l-2 border-red-400 pl-3">
                Payment unavailable — please contact us to book.
              </p>
            )
          )}

          {confirmed && (
            <div className="flex flex-col items-center text-center py-10">
              <div className="flex items-center justify-center w-16 h-16 mb-6" style={{ background: 'var(--forest)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-serif text-2xl font-bold text-gray-900 mb-2">Booking Confirmed</h3>
              <p className="text-sm font-medium text-gray-700 mb-1">{mentor.full_name} — {service.name}</p>
              <p className="text-sm text-gray-400 mb-6">{formatDateLong(slot.date)} at {slot.time}</p>
              <p className="text-sm text-gray-500 mb-8 max-w-xs">
                A confirmation email has been sent to <span className="font-medium text-gray-700">{email}</span>
              </p>
              <button onClick={onClose}
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

        {!confirmed && step === 2 && (
          <div className="flex items-center justify-between px-7 py-5 border-t border-gray-200 flex-shrink-0">
            <div />
            <button
              onClick={() => setStep(3)}
              disabled={!canContinueStep2}
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

export default function MentorBookingOverlay(props: {
  mentor: Mentor
  service: ServiceInfo
  slot: { date: string; time: string }
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null
  return createPortal(<MentorBookingOverlayInner {...props} />, document.body)
}
