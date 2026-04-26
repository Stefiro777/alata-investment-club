'use client'

import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('cookie-consent')) setVisible(true)
  }, [])

  function handle(choice: 'accepted' | 'declined') {
    sessionStorage.setItem('cookie-consent', choice)
    if (choice === 'accepted') {
      window.dispatchEvent(new Event('cookie-consent-updated'))
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line-faint py-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <p className="text-sm text-ink-500">
        We use cookies to improve your experience. By continuing to browse, you accept our use of cookies.
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => handle('declined')}
          className="border border-black text-black text-xs font-medium tracking-wide px-5 py-2 hover:bg-black hover:text-white transition-colors duration-fast"
        >
          Decline
        </button>
        <button
          onClick={() => handle('accepted')}
          className="bg-forest text-white text-xs font-medium tracking-wide px-5 py-2 hover:bg-forest-deep transition-colors duration-fast"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
