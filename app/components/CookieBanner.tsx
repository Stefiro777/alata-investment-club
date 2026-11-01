'use client'

import { useState, useSyncExternalStore } from 'react'

const KEY = 'cookie-consent'
const noop = () => () => {}

export default function CookieBanner() {
  // Read the stored choice without a setState-in-effect; the server renders nothing.
  const stored = useSyncExternalStore(noop, () => sessionStorage.getItem(KEY), () => 'pending')
  const [dismissed, setDismissed] = useState(false)

  function handle(choice: 'accepted' | 'declined') {
    sessionStorage.setItem(KEY, choice)
    if (choice === 'accepted') {
      window.dispatchEvent(new Event('cookie-consent-updated'))
    }
    setDismissed(true)
  }

  if (dismissed || stored !== null) return null

  // Accept and Decline carry the same weight: no nudging towards consent.
  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed inset-x-3 bottom-3 z-[180] flex flex-col gap-4 rounded-[18px] bg-night px-6 py-5 text-ivory shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] sm:inset-x-auto sm:left-1/2 sm:w-[min(760px,calc(100%-32px))] sm:-translate-x-1/2 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-[13px] leading-[1.6] text-ivory/85">
        We use analytics cookies only if you accept them, to understand how the site is used.
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => handle('declined')}
          className="rounded-full border border-ivory/70 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] hover:bg-ivory/10"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => handle('accepted')}
          className="rounded-full border border-ivory/70 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] hover:bg-ivory/10"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
