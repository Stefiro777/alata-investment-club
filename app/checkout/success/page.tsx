'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  useSearchParams() // consume to satisfy Suspense boundary

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-night">
      <div className="rd-gutter pt-6 md:pt-[30px]">
        <Link href="/" aria-label="Alata Investment Club, home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/redesign/logo-dark.png" alt="Alata" className="h-[34px] w-auto md:h-10" />
        </Link>
      </div>
      <div className="rd-gutter flex flex-1 flex-col justify-center py-20">
        <div className="text-[13px] text-earth-700">Order confirmed</div>
        <h1 className="rd-display mt-3 text-[clamp(52px,7vw,88px)]">Thank <em>you.</em></h1>
        <p className="mt-6 max-w-[460px] text-[16px] leading-[1.7] text-earth-700">
          A receipt has been sent to your email. For merch, we will write to you with the shipping details.
        </p>
        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
          <Link href="/merch" className="rd-italic text-[36px] text-club hover:underline underline-offset-[0.18em]">Back to the shop</Link>
          <Link href="/events" className="rd-italic text-[36px] hover:underline underline-offset-[0.18em]">Next events</Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ivory" />}>
      <SuccessContent />
    </Suspense>
  )
}
