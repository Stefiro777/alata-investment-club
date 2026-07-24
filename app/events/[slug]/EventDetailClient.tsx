'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { UpcomingEvent } from '@/lib/types'
import EventRegistrationModal from '@/app/components/EventRegistrationModal'
import { useCart } from '@/app/components/CartContext'

type GalleryImage = { id: string; url: string; display_order: number }

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatTime(t: string | null | undefined) {
  if (!t) return null
  return t.slice(0, 5)
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function priceLabel(event: UpcomingEvent): string {
  const nonMember = event.ticket_price_cents ?? 0
  const member = event.member_price_cents ?? nonMember
  const hasTicket = event.ticket_price_cents !== null && event.ticket_price_cents !== undefined
  if (!hasTicket || (nonMember === 0 && member === 0)) return 'Free'
  if (member !== nonMember) return `${fmtEur(member)} members · ${fmtEur(nonMember)} non-members`
  return fmtEur(nonMember)
}

// ── Hero gallery ──────────────────────────────────────────────────────────────
function HeroGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [idx, setIdx] = useState(0)
  const hasImages = images.length > 0

  return (
    <div className="absolute inset-0 overflow-hidden">
      {hasImages ? (
        <Image
          key={images[idx].id}
          src={images[idx].url}
          alt={title}
          fill
          priority
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-forest" />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.6)' }} />
      <div className="absolute inset-0 hero-vignette" />

      {images.length > 1 && (
        <>
          <button
            onClick={() => setIdx(i => (i === 0 ? images.length - 1 : i - 1))}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => setIdx(i => (i === images.length - 1 ? 0 : i + 1))}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
            {images.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setIdx(i)}
                aria-label={`Photo ${i + 1}`}
                className={`rounded-full transition-all ${i === idx ? 'w-2.5 h-2.5 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EventDetailClient({
  event,
  images,
}: {
  event: UpcomingEvent
  images: GalleryImage[]
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const [added, setAdded] = useState(false)
  const { addItem } = useCart()

  const hasTicket = event.status === 'open' && event.ticket_price_cents !== null && event.ticket_price_cents !== undefined
  const isPaidTicket = hasTicket && (event.ticket_price_cents ?? 0) > 0
  const isFreeTicket = hasTicket && event.ticket_price_cents === 0

  function handleAddTicket() {
    addItem({
      type: 'ticket',
      cartKey: `ticket:${event.id}`,
      name: event.title,
      priceCents: event.ticket_price_cents ?? 0,
      eventId: event.id,
      eventDate: event.date,
      eventLocation: event.location ?? null,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const time = formatTime(event.start_time) && formatTime(event.end_time)
    ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
    : formatTime(event.start_time) ?? formatTime(event.end_time) ?? '—'

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[420px] sm:min-h-[520px] text-white flex items-end overflow-hidden">
        <HeroGallery images={images} title={event.title} />
        <div className="relative z-10 w-full py-10">
          <div className="max-w-5xl mx-auto px-6 lg:px-8">
            {event.status !== 'open' && (
              <span className="inline-block bg-white/15 border border-white/30 text-[10px] font-medium tracking-[0.2em] uppercase px-3 py-1 mb-4">
                {event.status === 'coming_soon' ? 'Coming Soon' : 'Completed'}
              </span>
            )}
            <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight mb-3">
              {event.title}
            </h1>
            <p className="text-white/70 text-sm">
              {formatDate(event.date)}
              {event.location ? ` · ${event.location}` : ''}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-12 sm:py-16">
        {/* Info box: Date / Time / Location / Price */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border border-line-faint p-6 sm:p-8 mb-12">
          <div>
            <p className="text-xs tracking-widest uppercase text-forest mb-1">Date</p>
            <p className="text-sm text-ink-900 font-medium">{formatDate(event.date)}</p>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-forest mb-1">Time</p>
            <p className="text-sm text-ink-900 font-medium">{time}</p>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-forest mb-1">Location</p>
            <p className="text-sm text-ink-900 font-medium">{event.location ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs tracking-widest uppercase text-forest mb-1">Price</p>
            <p className="text-sm text-ink-900 font-medium">{priceLabel(event)}</p>
          </div>
        </div>

        {/* Status-based action */}
        {event.status === 'coming_soon' && (
          <div className="bg-[#f3f4f6] border border-[#e5e7eb] px-6 py-8 text-center mb-12">
            <p className="text-sm text-ink-500">
              Registrations will open soon. Follow us not to miss it.
            </p>
          </div>
        )}

        {event.status === 'open' && (
          <div className="mb-12">
            {isPaidTicket || isFreeTicket ? (
              <button
                onClick={handleAddTicket}
                className={`inline-block border text-xs font-medium tracking-[0.2em] uppercase px-6 py-3 transition-colors ${
                  added ? 'border-forest bg-forest text-white' : 'border-forest bg-forest text-white hover:bg-forest-deep'
                }`}
              >
                {added ? 'Added ✓' : isFreeTicket ? 'Add ticket — Free' : `Add ticket — ${fmtEur(event.ticket_price_cents ?? 0)}`}
              </button>
            ) : event.action_type === 'link' && event.action_link ? (
              <a
                href={event.action_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-[0.2em] uppercase px-6 py-3 transition-colors"
              >
                Register Now
              </a>
            ) : event.action_type === 'form' ? (
              <button
                onClick={() => setModalOpen(true)}
                className="inline-block bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-[0.2em] uppercase px-6 py-3 transition-colors"
              >
                Register Now
              </button>
            ) : (
              <span className="inline-block bg-forest text-white text-xs font-medium tracking-[0.2em] uppercase px-6 py-3">
                Register Now
              </span>
            )}
          </div>
        )}

        {event.status === 'completed' && (
          <div className="border-l-2 border-line-faint pl-4 mb-12">
            <p className="text-sm text-ink-500">This event has ended.</p>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-forest mb-4">The Event</p>
            <p className="text-ink-900 text-sm leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
              {event.description}
            </p>
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-line-faint">
          <Link href="/events" className="text-xs font-medium tracking-widest uppercase text-forest hover:underline">
            ← Back to Events
          </Link>
        </div>
      </div>

      {modalOpen && (
        <EventRegistrationModal
          event={{ id: event.id, title: event.title, date: event.date, registration_field: event.registration_field }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
