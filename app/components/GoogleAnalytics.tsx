'use client'

import Script from 'next/script'
import { useState, useEffect } from 'react'

const GA_ID = 'G-1DKFFPXFT6'

/**
 * Loads Google Analytics only after the cookie banner records consent
 * (cookie-consent === 'accepted' in sessionStorage). CookieBanner dispatches
 * 'cookie-consent-updated' when the user accepts, so the scripts mount
 * without a page reload.
 */
export default function GoogleAnalytics() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    const check = () => {
      setConsented(sessionStorage.getItem('cookie-consent') === 'accepted')
    }
    check()
    window.addEventListener('cookie-consent-updated', check)
    return () => window.removeEventListener('cookie-consent-updated', check)
  }, [])

  if (!consented) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  )
}
