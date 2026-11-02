'use client'

import { useEffect, useState } from 'react'

const OPEN_POLICY = 'cookie-policy-open'

/** Opens the policy from anywhere (the cookie banner links to it). */
export function openCookiePolicy() {
  window.dispatchEvent(new Event(OPEN_POLICY))
}

export default function CookiePolicy({ trigger = true }: { trigger?: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_POLICY, onOpen)
    return () => window.removeEventListener(OPEN_POLICY, onOpen)
  }, [])

  return (
    <>
      {trigger && (
        <button type="button" onClick={() => setOpen(true)} className="hover:text-ivory">
          Cookie Policy
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-night/60" />

          {/* Modal */}
          <div
            role="dialog" aria-modal="true" aria-label="Cookie Policy" className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[18px] bg-ivory p-8 text-night md:p-10"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-6 top-6 text-[13px] font-medium hover:underline underline-offset-[6px]"
            >
              Close
            </button>

            <h2 className="rd-display mb-6 text-[40px]">Cookie Policy</h2>

            <div className="space-y-5 text-sm text-earth-700 leading-relaxed">
              <section>
                <h3 className="font-semibold text-ink-900 mb-1">What are cookies?</h3>
                <p>
                  Cookies are small text files stored on your device when you visit a website. They allow the site to remember your preferences and improve your browsing experience across visits.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-ink-900 mb-1">Which cookies do we use?</h3>
                <p>
                  Alata Investment Club uses only <strong>technical and functional cookies</strong> — strictly necessary for the website to operate correctly. These include session authentication cookies that allow logged-in members to access the reserved area without having to sign in on every page.
                </p>
                <p className="mt-2">
                  We do <strong>not</strong> use tracking cookies, advertising cookies, or any third-party analytics cookies that profile your behaviour across other websites.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-ink-900 mb-1">Do we sell your data?</h3>
                <p>
                  No. We do not sell, share, or transfer your personal data or browsing information to any third party for commercial purposes.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-ink-900 mb-1">How to disable cookies</h3>
                <p>
                  You can manage or disable cookies at any time through your browser settings. Please note that disabling technical cookies may prevent certain features of the site — such as the members area — from functioning correctly.
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-ink-500">
                  <li>Chrome: Settings → Privacy and security → Cookies</li>
                  <li>Firefox: Settings → Privacy & Security → Cookies and Site Data</li>
                  <li>Safari: Preferences → Privacy → Manage Website Data</li>
                  <li>Edge: Settings → Cookies and site permissions</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-ink-900 mb-1">Contact</h3>
                <p>
                  For any questions regarding this Cookie Policy, please contact us at{' '}
                  <a href="mailto:info@alatainvestmentclub.com" className="text-club underline underline-offset-4">
                    info@alatainvestmentclub.com
                  </a>.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
