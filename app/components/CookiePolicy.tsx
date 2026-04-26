'use client'

import { useState } from 'react'

export default function CookiePolicy() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-white/40 hover:text-white/80 transition-colors tracking-wide"
      >
        Cookie Policy
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Modal */}
          <div
            className="relative bg-white max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 border border-forest text-forest text-xs font-medium tracking-wide px-4 py-1.5 hover:bg-forest hover:text-white transition-colors duration-fast"
            >
              Close
            </button>

            <h2 className="font-serif text-2xl font-bold text-ink-900 mb-6">Cookie Policy</h2>

            <div className="space-y-5 text-sm text-[#4b5563] leading-relaxed">
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
                  <a href="mailto:info@alatainvestmentclub.com" className="text-forest underline">
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
