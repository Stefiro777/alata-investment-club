'use client'

import Script from 'next/script'
import { useSyncExternalStore } from 'react'
import { GA_ID, readConsent, subscribeConsent } from '@/lib/consent'

/**
 * Google Analytics loads only after the visitor accepts in the cookie banner.
 * Before a choice, or after Decline, no request goes to Google and no _ga
 * cookie is set. A Decline after an Accept disables the loaded tag at once
 * (ga-disable flag, see lib/consent) and removes its cookies.
 */
export default function GoogleAnalytics() {
  const consented = useSyncExternalStore(subscribeConsent, () => readConsent() === 'accepted', () => false)
  if (!consented) return null

  return (
    <>
      <Script id="ga-enable" strategy="afterInteractive">
        {`window['ga-disable-${GA_ID}'] = false;`}
      </Script>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
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
