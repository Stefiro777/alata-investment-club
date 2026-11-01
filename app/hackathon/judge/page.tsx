import type { Metadata } from 'next'
import Link from 'next/link'
import JudgeClient from './JudgeClient'

export const metadata: Metadata = {
  title: 'M&A Hackathon — Judge | Alata Investment Club',
  alternates: { canonical: 'https://alatainvestmentclub.com/hackathon/judge' },
}

export default function HackathonJudgePage() {
  return (
    <>
      <div className="rd-gutter bg-paper pt-6">
        <Link href="/" aria-label="Alata Investment Club, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-dark.png" alt="Alata" className="h-[34px] w-auto" />
        </Link>
      </div>
      <JudgeClient />
    </>
  )
}
