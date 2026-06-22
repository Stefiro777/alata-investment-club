import type { Metadata } from 'next'
import CareerServiceClient from './CareerServiceClient'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/career-service' },
}

export default function CareerServicePage() {
  return <CareerServiceClient />
}
