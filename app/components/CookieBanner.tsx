'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { onCookieSettingsOpen, readConsent, saveConsent, subscribeConsent, type Consent } from '@/lib/consent'
import { openCookiePolicy } from './CookiePolicy'

/**
 * Cookie banner in the site's language: outline pills, Accept and Decline with
 * the same weight. Shown until a choice is made; the footer's "Manage
 * cookies" opens it again to change the choice.
 */
export default function CookieBanner() {
  // undefined on the server, so nothing is rendered before hydration.
  const consent = useSyncExternalStore<Consent | null | undefined>(subscribeConsent, readConsent, () => undefined)
  const [reopened, setReopened] = useState(false)

  useEffect(() => onCookieSettingsOpen(() => setReopened(true)), [])

  if (consent === undefined || (consent !== null && !reopened)) return null

  function choose(choice: Consent) {
    saveConsent(choice)
    setReopened(false)
  }

  const pill = (active: boolean) =>
    `rounded-full border px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors ${
      active ? 'border-ivory bg-ivory/10' : 'border-ivory/70 hover:bg-ivory/10'
    }`

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[180] rounded-[18px] bg-night px-6 py-5 text-ivory shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] sm:inset-x-auto sm:left-1/2 sm:w-[min(780px,calc(100%-32px))] sm:-translate-x-1/2"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-[22px] font-medium italic leading-[1.15]">Cookies</p>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-ivory/85">
            We use Google Analytics only if you accept, to see how the site is used. Nothing is tracked until you choose.{' '}
            <button type="button" onClick={openCookiePolicy} className="underline underline-offset-4 hover:text-ivory">Cookie policy</button>
          </p>
          {consent && (
            <p className="mt-1 text-[12px] text-ivory/60">Your current choice: {consent === 'accepted' ? 'accepted' : 'declined'}.</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" onClick={() => choose('declined')} className={pill(consent === 'declined')}>Decline</button>
          <button type="button" onClick={() => choose('accepted')} className={pill(consent === 'accepted')}>Accept</button>
        </div>
      </div>
    </div>
  )
}
