'use client'

import { useState } from 'react'

export type Company = { id: string; name: string; logo_url: string; website_url: string | null }

/**
 * One row of company logos drifting slowly; duplicated for a seamless loop.
 * A logo that fails to load (e.g. a Brandfetch hotlink refused) drops out
 * instead of leaving an empty tile.
 */
export default function LogoTrack({ companies, direction, seconds }: { companies: Company[]; direction: 'l' | 'r'; seconds: number }) {
  const [failed, setFailed] = useState<Set<string>>(() => new Set())
  const ok = companies.filter(c => !failed.has(c.id))
  if (ok.length === 0) return null
  const loop = [...ok, ...ok]
  return (
    <div className="overflow-hidden">
      <ul
        className="flex w-max motion-reduce:!animate-none"
        style={{ animation: `rd-marquee-${direction} ${seconds}s linear infinite` }}
      >
        {loop.map((c, i) => (
          <li key={`${c.id}-${i}`} aria-hidden={i >= ok.length} className="mr-[18px] flex h-[80px] w-[180px] shrink-0 items-center justify-center bg-ivory px-6 md:h-[96px] md:w-[220px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.logo_url}
              alt={i < ok.length ? c.name : ''}
              className="max-h-[44px] max-w-full object-contain"
              loading="lazy"
              onError={() => setFailed(prev => new Set(prev).add(c.id))}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
