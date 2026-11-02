'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import type { UpcomingEvent } from '@/lib/types'
import { useCart } from '@/app/components/CartContext'
import { useMemberAccess } from '@/app/components/useMemberAccess'
import { VeiledMedia, ScrollProgress } from '@/app/components/site/Media'
import Lightbox from '@/app/components/site/Lightbox'
import { StatusPill } from '@/app/components/site/ui'
import { eventKind, fmtEur, priceLine, shortDate, timeRange } from '@/lib/event-display'
import { RegistrationForm, WaitlistForm } from './RegisterForms'

type GalleryImage = { id: string; url: string; display_order: number }
type EventWithSpeaker = UpcomingEvent & { speaker_name?: string | null; speaker_role?: string | null }

/* Boards Se1–Se4: the date opens huge, then shrinks into a bar that stays on
   top while you read and register; Register is always within reach. */
export default function EventDetailClient({
  event,
  images,
  soldOut = false,
  isPast = false,
  nav,
}: {
  event: EventWithSpeaker
  images: GalleryImage[]
  soldOut?: boolean
  /** The event day has gone by (decided on the server, by date). */
  isPast?: boolean
  nav: ReactNode
}) {
  const { addItem } = useCart()
  const access = useMemberAccess()
  const [added, setAdded] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  // The registration block stays closed until Register is pressed.
  const [opened, setOpened] = useState(false)
  const scrollToForm = useRef(false)
  const heroRegister = useRef<HTMLButtonElement>(null)
  const registerSection = useRef<HTMLElement>(null)
  const [heroRegisterInView, setHeroRegisterInView] = useState(true)
  const [formInView, setFormInView] = useState(false)

  const d = new Date(event.date + 'T00:00:00')
  const kind = eventKind(event.title)
  const membersLocked = !!event.members_only && !access.active
  const isOpen = event.status === 'open' && !isPast
  const hasTicket = isOpen && !soldOut && !membersLocked && event.ticket_price_cents !== null && event.ticket_price_cents !== undefined
  const canRegister = isOpen && (soldOut || membersLocked || hasTicket || event.action_type === 'form' || (event.action_type === 'link' && !!event.action_link))
  const statusLabel = isPast ? 'Past' : soldOut && isOpen ? 'Full' : isOpen ? 'Open' : event.status === 'coming_soon' ? 'Soon' : 'Past'
  const when = [d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }), timeRange(event.start_time, event.end_time)].filter(Boolean).join(' · ')
  const price = priceLine(event.ticket_price_cents, event.member_price_cents)
  const memberNote = event.ticket_price_cents && (event.member_price_cents ?? event.ticket_price_cents) < event.ticket_price_cents
    ? 'Member price recognised automatically.'
    : null
  const isTalk = kind === 'Career Talk' || kind === 'Talk'
  const photos = images.map(i => i.url)

  // Title "Career Talk w/Giulia Ranzetti" → guest in italics.
  const [lead, guest] = event.title.split(/\s+w\/\s*/i)

  function addTicket() {
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

  function onRegister() {
    if (opened) {
      registerSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      scrollToForm.current = true
      setOpened(true)
    }
  }

  // After the block opens, bring it into view.
  useEffect(() => {
    if (!opened || !scrollToForm.current) return
    scrollToForm.current = false
    requestAnimationFrame(() => registerSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [opened])

  // Register is shown once at a time: the big one in the opening block; the
  // compact bar shows it only when that one has left the screen (and the
  // registration block itself is not on screen).
  useEffect(() => {
    const el = heroRegister.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setHeroRegisterInView(entry.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [canRegister])
  useEffect(() => {
    const el = registerSection.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setFormInView(entry.isIntersecting), { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [opened])
  const showBarRegister = canRegister && !heroRegisterInView && !formInView
  const showRegisterBlock = !canRegister || opened

  return (
    <>
      {/* ── Se1 · opening ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-moss text-ivory">
        {photos[0] && <VeiledMedia image={photos[0]} alt="" veil="#12352a" opacity={0.62} priority />}
        {nav}
        <div className="rd-gutter relative flex flex-1 flex-col pb-8 pt-[clamp(120px,22vh,170px)]">
          <div className="flex flex-wrap items-center gap-4">
            <StatusPill tone="dark" solid={isOpen && !soldOut}>{statusLabel}</StatusPill>
            {event.members_only && <StatusPill tone="dark">Members only</StatusPill>}
            {kind && <span className="text-[13px] text-ivory/80">{kind}</span>}
          </div>
          <h1 className="rd-display mt-6 max-w-[760px] text-[clamp(44px,6.3vw,76px)]">
            {lead}{guest && <> w/ <em>{guest}</em></>}
          </h1>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-x-10 gap-y-4 pt-10">
            <div className="flex items-end gap-6 md:gap-10">
              <span aria-hidden className="font-serif text-[clamp(140px,25vw,300px)] font-medium leading-[0.85]">{d.getDate()}</span>
              <span className="rd-italic pb-[clamp(10px,2.5vw,30px)] text-[clamp(26px,3.3vw,40px)]">
                {d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            {canRegister && (
              <button ref={heroRegister} type="button" onClick={onRegister} className="rd-italic pb-[clamp(10px,2.5vw,30px)] text-[clamp(48px,6vw,72px)] leading-[1.1] hover:underline underline-offset-[0.18em]">
                Register
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── The date shrinks into a bar that stays on top ─────────────── */}
      <div className="sticky top-0 z-30 border-b border-ivory/20 bg-pine/95 text-ivory backdrop-blur-sm">
        <div className="rd-gutter flex h-[72px] items-center gap-4 md:h-[96px] md:gap-6">
          <span className="rd-display shrink-0 text-[28px] md:text-[40px]">{shortDate(event.date)}</span>
          <span className="min-w-0 truncate text-[13px] text-ivory/85 md:text-[14px]">{event.title}</span>
          {showBarRegister && (
            <button type="button" onClick={onRegister} className="rd-italic ml-auto shrink-0 rounded-full border border-ivory px-5 pb-2.5 pt-2 text-[22px] leading-none hover:bg-ivory/10 md:px-[34px] md:pb-3.5 md:pt-3 md:text-[30px]">
              Register
            </button>
          )}
        </div>
      </div>

      {/* ── Se2 · the details ─────────────────────────────────────────── */}
      <section className="bg-pine text-ivory">
        <div className="rd-gutter grid gap-12 py-[clamp(56px,8vw,80px)] md:grid-cols-[minmax(0,560px)_minmax(0,424px)] md:justify-between">
          <div>
            <h2 className="rd-display text-[clamp(40px,4.7vw,56px)]">{isTalk ? 'About the talk' : 'About the event'}</h2>
            <p className="mt-6 whitespace-pre-line text-[17px] leading-[1.75] text-ivory/[0.88]">
              {event.description || 'More details on the programme will follow soon.'}
            </p>
            {photos.length > 1 && (
              <div className="mt-10">
                <div className="grid grid-cols-3 gap-3">
                  {photos.slice(0, 3).map((src, i) => (
                    <button key={src} type="button" onClick={() => setLightbox(i)} className="aspect-[4/5] overflow-hidden bg-moss" aria-label={`Open photo ${i + 1}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setLightbox(0)} className="rd-italic mt-4 text-[26px] hover:underline underline-offset-[0.18em]">
                  View all photos
                </button>
              </div>
            )}
          </div>

          <div className="md:sticky md:top-[128px] md:self-start">
            <dl className="border-t border-ivory/40">
              {event.speaker_name && (
                <div className="border-b border-ivory/20 py-[18px]">
                  <dt className="text-[13px] text-ivory/70">Speaker</dt>
                  <dd className="rd-display mt-1 text-[28px]">{[event.speaker_name, event.speaker_role].filter(Boolean).join(' · ')}</dd>
                </div>
              )}
              <div className="border-b border-ivory/20 py-[18px]">
                <dt className="text-[13px] text-ivory/70">When</dt>
                <dd className="rd-display mt-1 text-[28px]">{when}</dd>
              </div>
              {event.location && (
                <div className="border-b border-ivory/20 py-[18px]">
                  <dt className="text-[13px] text-ivory/70">Where</dt>
                  <dd className="rd-display mt-1 text-[28px]">{event.location}</dd>
                </div>
              )}
              <div className="border-b border-ivory/20 py-[18px]">
                <dt className="text-[13px] text-ivory/70">Price</dt>
                <dd className="rd-display mt-1 text-[28px]">{price}</dd>
              </div>
            </dl>
            {canRegister && memberNote && <p className="mt-4 text-[13px] text-ivory/70">{memberNote}</p>}
          </div>
        </div>
      </section>

      {/* ── Se3 / Se4 · registration ─────────────────────────────────── */}
      {showRegisterBlock && (
      <section ref={registerSection} id={canRegister ? 'register' : undefined} className="scroll-mt-[72px] bg-ivory text-night md:scroll-mt-[96px]">
        <div className="rd-gutter grid gap-10 py-[clamp(56px,8vw,80px)] md:grid-cols-[minmax(0,360px)_minmax(0,624px)] md:justify-between">
          <div>
            <h2 className="rd-display text-[clamp(52px,6vw,72px)]">{isOpen ? 'Your place' : isPast || event.status !== 'coming_soon' ? 'Past event' : 'Soon'}</h2>
            <p className="mt-6 text-[15px] leading-[1.7] text-earth-700">
              {!isOpen
                ? event.status === 'coming_soon' && !isPast
                  ? 'Registrations open soon. Follow us on LinkedIn and Instagram not to miss them.'
                  : 'This event has ended. Look out for the next ones.'
                : membersLocked
                  ? 'This event is reserved for verified club members.'
                  : soldOut
                    ? 'The event is full. Join the waitlist: if a place becomes free, we write to you.'
                    : event.registration_field === 'panelists'
                      ? 'Members are recognised automatically. You can send a question to the speaker in advance. If the event is full, you join the waitlist.'
                      : event.registration_field === 'motivation'
                        ? 'Members are recognised automatically. When places are assigned by selection, we read every motivation. If the event is full, you join the waitlist.'
                        : 'Members are recognised automatically. If the event is full, you join the waitlist.'}
            </p>
          </div>

          <div className="min-w-0">
            {!isOpen ? (
              <Link href="/events" className="rd-italic text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em]">
                All events
              </Link>
            ) : membersLocked ? (
              access.loading ? null : access.authenticated ? (
                <Link href="/dashboard/membership" className="rd-italic text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em]">
                  Renew your membership
                </Link>
              ) : (
                <Link href={`/login?redirectTo=/events/${event.slug ?? ''}`} className="rd-italic text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em]">
                  Log in to register
                </Link>
              )
            ) : soldOut ? (
              <WaitlistForm eventId={event.id} />
            ) : hasTicket ? (
              <div>
                <p className="rd-display text-[clamp(32px,3.5vw,44px)]">
                  {event.ticket_price_cents ? `Ticket · ${fmtEur(event.ticket_price_cents)}` : 'Free ticket'}
                </p>
                {event.member_price_cents != null && event.member_price_cents !== event.ticket_price_cents && (
                  <p className="mt-2 text-[14px] text-earth-700">Members pay {event.member_price_cents ? fmtEur(event.member_price_cents) : 'nothing'}: the price updates at checkout.</p>
                )}
                <button type="button" onClick={addTicket} className="rd-italic mt-6 text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em]">
                  {added ? 'Added to your cart' : 'Add to cart'}
                </button>
              </div>
            ) : event.action_type === 'link' && event.action_link ? (
              <a href={event.action_link} target="_blank" rel="noopener noreferrer" className="rd-italic text-[clamp(36px,4vw,48px)] text-club hover:underline underline-offset-[0.18em]">
                Register on the partner site
              </a>
            ) : event.action_type === 'form' ? (
              <RegistrationForm event={{ id: event.id, registration_field: event.registration_field }} />
            ) : (
              <p className="rd-italic text-[28px] text-earth-700">Registrations are handled directly by the club: write to info@alatainvestmentclub.com.</p>
            )}
          </div>
        </div>
      </section>
      )}

      {lightbox !== null && <Lightbox photos={photos} start={lightbox} title={event.title} onClose={() => setLightbox(null)} />}
      <ScrollProgress color="var(--ivory)" />
    </>
  )
}
