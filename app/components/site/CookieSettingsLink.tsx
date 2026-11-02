'use client'

import { openCookieSettings } from '@/lib/consent'

/** Footer link that reopens the cookie banner to change the choice. */
export default function CookieSettingsLink() {
  return (
    <button type="button" onClick={openCookieSettings} className="hover:text-ivory">
      Manage cookies
    </button>
  )
}
