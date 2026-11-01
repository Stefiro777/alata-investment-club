import type { Metadata } from 'next'
import Link from 'next/link'
import HackathonClient from './HackathonClient'

export const metadata: Metadata = {
  title: 'M&A Hackathon | Alata Investment Club',
  alternates: { canonical: 'https://alatainvestmentclub.com/hackathon' },
}

export default function HackathonPage() {
  return (
    <>
      <div className="rd-gutter bg-paper pt-6">
        <Link href="/" aria-label="Alata Investment Club, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-dark.png" alt="Alata" className="h-[34px] w-auto" />
        </Link>
      </div>
      <HackathonClient />
    </>
  )
}
