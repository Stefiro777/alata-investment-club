import type { Metadata } from 'next'
import HackathonClient from './HackathonClient'

export const metadata: Metadata = {
  title: 'M&A Hackathon | Alata Investment Club',
  alternates: { canonical: 'https://alatainvestmentclub.com/hackathon' },
}

export default function HackathonPage() {
  return <HackathonClient />
}
