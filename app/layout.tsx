import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'
import MobileMenu from './components/MobileMenu'
import CookieBanner from './components/CookieBanner'
import CookiePolicy from './components/CookiePolicy'

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
}

const navLinks = [
  { href: '/', label: 'About' },
  { href: '/reports', label: 'Reports' },
  { href: '/team', label: 'Team' },
  { href: '/career-service', label: 'Career Service' },
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {/* Navbar */}
        <header className="bg-[#1a4a3a] shadow-md sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo + nome */}
              <Link href="/" className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Alata Investment Club"
                  width={44}
                  height={44}
                  className="object-contain flex-shrink-0"
                  style={{ filter: 'brightness(0) invert(1)' }}
                  priority
                />
                <span className="font-serif font-bold text-white text-lg leading-tight whitespace-nowrap">
                  Alata Investment Club
                </span>
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-white/80 hover:text-white text-sm tracking-wide transition-colors duration-150 ${
                      link.label === 'Team' || link.label === 'Career Service'
                        ? 'font-bold'
                        : 'font-medium'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Mobile menu */}
              <MobileMenu links={navLinks} />
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="flex-1">{children}</main>
        <CookieBanner />

        {/* Footer */}
        <footer className="bg-[#1a4a3a] text-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              {/* Logo + nome */}
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Alata Investment Club"
                  width={40}
                  height={40}
                  className="object-contain flex-shrink-0"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
                <span className="font-serif font-bold text-white text-base leading-tight whitespace-nowrap">
                  Alata Investment Club
                </span>
              </div>

              {/* Nav links */}
              <div className="flex flex-wrap gap-6">
                {navLinks.map((link) => (
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
                  href="mailto:Alatabrixiaic@gmail.com"
                  aria-label="Email"
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <MailIcon className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-white/40 text-xs tracking-wide">
                &copy; 2025 Alata Investment Club
              </p>
              <p className="text-white/40 text-xs">
                Alatabrixiaic@gmail.com
              </p>
              <CookiePolicy />
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
