import type { Metadata } from 'next'
import JudgeClient from './JudgeClient'

export const metadata: Metadata = {
  title: 'M&A Hackathon — Judge | Alata Investment Club',
  alternates: { canonical: 'https://alatainvestmentclub.com/hackathon/judge' },
}

export default function HackathonJudgePage() {
  return <JudgeClient />
}
