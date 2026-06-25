import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import './globals.css'
import MobileMenu from './components/MobileMenu'
import CookieBanner from './components/CookieBanner'
import CookiePolicy from './components/CookiePolicy'
import AnalyticsWrapper from './components/AnalyticsWrapper'
import { CartProvider } from './components/CartContext'

import Script from 'next/script'

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Alata Investment Club',
  description: 'University Finance Association · University of Brescia',
  alternates: { canonical: 'https://alatainvestmentclub.com' },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
}

const navLinks: { href: string; label: string; subLinks?: { href: string; label: string }[] }[] = [
  { href: '/', label: 'About' },
  { href: '/reports', label: 'Reports' },
  { href: '/events', label: 'Events' },
  { href: '/team', label: 'Team', subLinks: [
    { href: '/team', label: 'Board of Directors' },
    { href: '/team/alumni', label: 'Alumni' },
  ]},
  { href: '/career-service', label: 'Career Service' },
  { href: '/partners', label: 'Partners' },
  { href: '/join-us', label: 'Join Us' },
  { href: '/dashboard', label: 'Reserved Area' },
]

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  noStore()
  const { data: setting } = await supabaseAdmin
    .from('settings').select('value').eq('key', 'merch_page_visible').maybeSingle()
  const merchVisible = setting?.value === 'true'

  const allNavLinks = [
    ...navLinks.slice(0, 5),
    ...(merchVisible ? [{ href: '/merch', label: 'Merch' }] : []),
    ...navLinks.slice(5),
  ]

  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <CartProvider>
        {/* Navbar */}
        <header className="bg-forest shadow-md sticky top-0 z-[100]">
          <nav className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo + nome */}
              <Link href="/" className="flex items-center gap-3">
                <img
                  src="/white.png"
                  alt="Alata"
                  className="h-8 w-8 object-contain"
                />
                <span className="font-serif font-bold text-white text-lg leading-tight whitespace-nowrap">
                  Alata Investment Club
                </span>
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-8">
                {allNavLinks.map((link) =>
                  link.subLinks ? (
                    <div key={link.href} className="relative group">
                      <button className={`flex items-center gap-1 text-white/80 hover:text-white text-sm tracking-wide transition-colors duration-fast ${link.label === 'Team' ? 'font-bold' : 'font-medium'}`}>
                        {link.label}
                        <svg className="w-3 h-3 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 hidden group-hover:block z-[100]">
                        <div className="bg-[#123a2d] border border-white/10 shadow-xl min-w-[190px] py-1">
                          {link.subLinks.map(sub => (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className="block px-5 py-2.5 text-white/75 hover:text-white hover:bg-white/10 text-sm tracking-wide transition-colors"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-white/80 hover:text-white text-sm tracking-wide transition-colors duration-fast ${
                        link.label === 'Career Service' ? 'font-bold' : 'font-medium'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>

              {/* Mobile menu */}
              <MobileMenu links={allNavLinks} />
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="flex-1">{children}</main>
        <AnalyticsWrapper />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-1DKFFPXFT6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1DKFFPXFT6');
          `}
        </Script>
        <CookieBanner />

        {/* Footer */}
        <footer className="bg-forest text-white border-t border-white/20">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              {/* Logo + nome */}
              <div className="flex items-center gap-3">
                <img
                  src="/white.png"
                  alt="Alata"
                  className="h-10 w-auto"
                />
              </div>

              {/* Nav links */}
              <div className="flex flex-wrap gap-6">
                {allNavLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-white/60 hover:text-white text-sm transition-colors tracking-wide"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Social */}
              <div className="flex items-center gap-5">
                <a
                  href="https://www.instagram.com/alata_investmentclub"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <InstagramIcon className="w-5 h-5" />
                </a>
                <a
                  href="https://www.linkedin.com/company/alatainvestmentclub/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <LinkedInIcon className="w-5 h-5" />
                </a>
                <a
                  href="mailto:info@alatainvestmentclub.com"
                  aria-label="Email"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <MailIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-white/40 text-xs tracking-wide">
                &copy; 2023 Alata Investment Club
              </p>
              <p className="text-white/40 text-xs">
                info@alatainvestmentclub.com
              </p>
              <div className="flex items-center gap-4">
                <Link
                  href="/privacy-policy"
                  className="text-xs text-white/40 hover:text-white/80 transition-colors tracking-wide"
                >
                  Privacy Policy
                </Link>
                <CookiePolicy />
              </div>
            </div>
          </div>
        </footer>
        </CartProvider>
      </body>
    </html>
  )
}
