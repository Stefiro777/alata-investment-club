import Link from 'next/link'
import CookiePolicy from '@/app/components/CookiePolicy'

/**
 * Quiet footer for the public pages. The boards end each page on its own
 * scene, so this stays small: logo, contacts, legal links.
 */
export default function SiteFooter() {
  return (
    <footer className="bg-night text-ivory">
      <div className="rd-gutter flex flex-col gap-10 border-t border-ivory/15 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-light.png" alt="Alata" width={800} height={431} className="h-10 w-auto" />
          <p className="mt-5 max-w-[320px] text-[13px] leading-[1.65] text-ivory/70">
            The first finance club of the University of Brescia.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-[13px] text-ivory/80 md:items-end">
          <a href="mailto:info@alatainvestmentclub.com" className="hover:text-ivory">info@alatainvestmentclub.com</a>
          <div className="flex gap-6">
            <a href="https://www.linkedin.com/company/alatainvestmentclub/" target="_blank" rel="noopener noreferrer" className="hover:text-ivory">LinkedIn</a>
            <a href="https://www.instagram.com/alata_investmentclub" target="_blank" rel="noopener noreferrer" className="hover:text-ivory">Instagram</a>
          </div>
          <div className="flex items-center gap-6 text-[12px] text-ivory/55">
            <span>&copy; {new Date().getFullYear()} Alata Investment Club</span>
            <Link href="/privacy-policy" className="hover:text-ivory">Privacy</Link>
            <CookiePolicy />
          </div>
        </div>
      </div>
    </footer>
  )
}
