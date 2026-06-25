'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  useSearchParams() // consume to satisfy Suspense boundary

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center"
         style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Icon */}
      <div className="w-16 h-16 border-2 border-[#1a4a3a] flex items-center justify-center mb-8">
        <svg className="w-8 h-8 text-[#1a4a3a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#1a4a3a] mb-4">
        Alata Investment Club
      </p>

      <h1 className="font-serif text-4xl sm:text-5xl font-bold text-black leading-tight mb-4">
        Order Confirmed
      </h1>

      <div className="w-10 h-px bg-black mx-auto mb-6" />

      <p className="text-base text-gray-600 max-w-sm mb-2">
        A receipt has been sent to your email.
      </p>
      <p className="text-sm text-gray-500 max-w-sm mb-10">
        We will contact you with shipping details shortly.
      </p>

      <Link
        href="/merch"
        className="text-[10px] font-semibold uppercase tracking-widest px-8 py-3.5 bg-[#1a4a3a] text-white hover:bg-[#143d30] transition-colors"
      >
        Back to Shop
      </Link>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
