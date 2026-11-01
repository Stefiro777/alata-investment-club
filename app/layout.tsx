import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'
import CookieBanner from './components/CookieBanner'
import AnalyticsWrapper from './components/AnalyticsWrapper'
import GoogleAnalytics from './components/GoogleAnalytics'
import { CartProvider } from './components/CartContext'

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

// Each public page renders its own navbar and footer (app/components/site),
// because the bar changes colour with the ground; the member area and the
// Board panel have their own shells.
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-ivory text-night">
        <CartProvider>
          {/* overflow-x: clip (not hidden) keeps position: sticky working */}
          <main className="flex-1 overflow-x-clip">{children}</main>
          <AnalyticsWrapper />
          {/* GA loads only after the cookie banner records consent */}
          <GoogleAnalytics />
          <CookieBanner />
        </CartProvider>
      </body>
    </html>
  )
}
