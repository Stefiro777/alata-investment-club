'use client'

import { useState, useEffect } from 'react'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) setVisible(true)
  }, [])

  function handle(choice: 'accepted' | 'declined') {
    localStorage.setItem('cookie-consent', choice)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-black/10 py-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <p className="text-sm text-[#6b7280]">
        We use cookies to improve your experience. By continuing to browse, you accept our use of cookies.
      </p>
      <div className="flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => handle('declined')}
          className="border border-black text-black text-xs font-medium tracking-wide px-5 py-2 hover:bg-black hover:text-white transition-colors duration-150"
        >
          Decline
        </button>
        <button
          onClick={() => handle('accepted')}
          className="bg-[#1a4a3a] text-white text-xs font-medium tracking-wide px-5 py-2 hover:bg-[#123a2d] transition-colors duration-150"
        >
          Accept
        </button>
      </div>
    </div>
  )
}
