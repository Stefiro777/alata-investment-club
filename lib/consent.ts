// Cookie consent, shared by the banner, Google Analytics and the footer link.
// The choice is kept in localStorage, so it survives reloads and new tabs.

export type Consent = 'accepted' | 'declined'

export const CONSENT_KEY = 'alata-cookie-consent'
export const GA_ID = 'G-1DKFFPXFT6'
const CHANGED = 'cookie-consent-updated'
const OPEN = 'cookie-settings-open'

export function readConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY)
    return v === 'accepted' || v === 'declined' ? v : null
  } catch {
    return null
  }
}

/** Removes the Google Analytics cookies (_ga, _ga_<id>) from this site. */
function clearAnalyticsCookies() {
  const names = document.cookie.split(';').map(c => c.split('=')[0].trim()).filter(n => n === '_ga' || n.startsWith('_ga_') || n === '_gid')
  const host = location.hostname
  const domains = ['', host, `.${host}`, `.${host.split('.').slice(-2).join('.')}`]
  for (const n of names) for (const d of domains) {
    document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
  }
}

const GA_HOSTS = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com)$/

function isGoogleAnalytics(url: unknown): boolean {
  try { return GA_HOSTS.test(new URL(String(url), location.href).hostname) } catch { return false }
}

/**
 * After a Decline, the tag that was already loaded on this page still tries to
 * flush a last hit when the page closes. Drop every beacon/fetch/XHR to Google
 * for the rest of this page's life; the next page does not load the tag at all.
 */
function blockAnalyticsRequests() {
  const w = window as unknown as { __gaBlocked?: boolean }
  if (w.__gaBlocked) return
  w.__gaBlocked = true
  const beacon = navigator.sendBeacon?.bind(navigator)
  if (beacon) navigator.sendBeacon = (url, data) => (isGoogleAnalytics(url) ? true : beacon(url, data))
  const f = window.fetch.bind(window)
  window.fetch = (input, init) => {
    const url = typeof input === 'string' || input instanceof URL ? input : input.url
    return isGoogleAnalytics(url) ? Promise.resolve(new Response(null, { status: 204 })) : f(input, init)
  }
  const open = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    if (isGoogleAnalytics(url)) url = 'data:,'
    return (open as (...a: unknown[]) => void).call(this, method, url, ...rest)
  } as typeof XMLHttpRequest.prototype.open
}

export function saveConsent(choice: Consent) {
  try { localStorage.setItem(CONSENT_KEY, choice) } catch { /* private mode: choice lasts this page */ }
  if (choice === 'declined') {
    // Stop an already loaded tag at once and remove what it set.
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = true
    clearAnalyticsCookies()
    blockAnalyticsRequests()
  } else {
    ;(window as unknown as Record<string, unknown>)[`ga-disable-${GA_ID}`] = false
  }
  window.dispatchEvent(new Event(CHANGED))
}

export function subscribeConsent(cb: () => void) {
  window.addEventListener(CHANGED, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CHANGED, cb)
    window.removeEventListener('storage', cb)
  }
}

/** Opens the banner again (footer "Manage cookies"). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN))
}

export function onCookieSettingsOpen(cb: () => void) {
  window.addEventListener(OPEN, cb)
  return () => window.removeEventListener(OPEN, cb)
}
