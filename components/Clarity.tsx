'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'

export default function Clarity() {
  const id = process.env.NEXT_PUBLIC_CLARITY_ID
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('cookie-consent') === 'accepted') {
      setShouldLoad(true)
    }

    function onConsentUpdated() {
      if (localStorage.getItem('cookie-consent') === 'accepted') {
        setShouldLoad(true)
      }
    }

    window.addEventListener('cookie-consent-updated', onConsentUpdated)
    return () => window.removeEventListener('cookie-consent-updated', onConsentUpdated)
  }, [])

  if (!id || !shouldLoad) return null

  return (
    <Script id="microsoft-clarity" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${id}");`}
    </Script>
  )
}
