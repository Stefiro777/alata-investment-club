'use client'

import { useEffect, useState } from 'react'

export type Company = { id: string; name: string; logo_url: string; website_url: string | null; opaque?: boolean }

/** Fewer logos than this: they sit still, centred, instead of drifting. */
const MIN_TO_SCROLL = 6
/** A logo that has not answered after this long is left out. */
const PROBE_TIMEOUT_MS = 6000

const baseLogoCls = 'max-h-[48px] max-w-full object-contain opacity-80'
/** Transparent logos: flattened to a white silhouette. */
const whiteCls = '[filter:brightness(0)_invert(1)]'
/**
 * Logos with an opaque (usually white) background, e.g. JPEGs: a silhouette filter would turn
 * the whole rectangle white. Invert instead (white background -> black, dark mark -> light) and
 * blend with "screen", so the black drops out and only the mark remains on the green band.
 */
const opaqueCls = '[filter:grayscale(1)_contrast(1.3)_invert(1)] mix-blend-screen'
const logoClsFor = (c: Company) => `${baseLogoCls} ${c.opaque ? opaqueCls : whiteCls}`
const slotCls = 'flex h-[64px] w-[160px] shrink-0 items-center justify-center md:h-[72px] md:w-[200px]'

/** True when the image has no transparency at its corners/edges (a solid background). */
function detectOpaque(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const n = 24
        const cv = document.createElement('canvas')
        cv.width = n; cv.height = n
        const ctx = cv.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(false)
        ctx.drawImage(img, 0, 0, n, n)
        const px = [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1], [n >> 1, 0], [n >> 1, n - 1], [0, n >> 1], [n - 1, n >> 1]]
        const solid = px.every(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3] > 240)
        resolve(solid)
      } catch { resolve(false) } // tainted canvas / no CORS: keep the default look
    }
    img.onerror = () => resolve(false)
    img.src = url
  })
}

/**
 * Loads every logo once, off screen, and keeps the ones that really arrive. A logo that
 * errors, is redirected to something that is not an image (a refused Brandfetch hotlink,
 * blocked by the CSP) or never answers is dropped, so no empty space is ever left.
 * Returns null while probing.
 */
function useLoadedLogos(companies: Company[]): Company[] | null {
  const [loaded, setLoaded] = useState<Map<string, boolean> | null>(null)

  useEffect(() => {
    let done = false
    const ok = new Map<string, boolean>()
    let pending = companies.length
    const finish = () => { if (!done) { done = true; setLoaded(new Map(ok)) } }
    if (pending === 0) { finish(); return }
    const timer = setTimeout(finish, PROBE_TIMEOUT_MS)
    const probes = companies.map(c => {
      const img = new Image()
      img.onload = () => {
        if (img.naturalWidth === 0) { if (--pending === 0) finish(); return }
        detectOpaque(c.logo_url).then(opaque => { ok.set(c.id, opaque); if (--pending === 0) finish() })
      }
      img.onerror = () => { if (--pending === 0) finish() }
      img.src = c.logo_url
      return img
    })
    return () => {
      done = true
      clearTimeout(timer)
      for (const img of probes) { img.onload = null; img.onerror = null }
    }
  }, [companies])

  return loaded ? companies.filter(c => loaded.has(c.id)).map(c => ({ ...c, opaque: loaded.get(c.id) })) : null
}

/** One row drifting slowly; the set is repeated enough times to fill any screen, then doubled for a seamless loop. */
function LogoTrack({ companies, direction, seconds }: { companies: Company[]; direction: 'l' | 'r'; seconds: number }) {
  if (companies.length === 0) return null
  const reps = Math.max(1, Math.ceil(1800 / (companies.length * 200)))
  const half = Array.from({ length: reps }, () => companies).flat()
  const loop = [...half, ...half]
  return (
    <div className="overflow-hidden">
      {/* bg-pine: the animated row is its own stacking context; without a backdrop of its own
          mix-blend-screen has nothing to blend with and the opaque logos stay as boxes. */}
      <ul className="flex w-max bg-pine motion-reduce:!animate-none" style={{ animation: `rd-marquee-${direction} ${seconds}s linear infinite` }}>
        {loop.map((c, i) => (
          <li key={`${c.id}-${i}`} aria-hidden={i >= half.length} className={`mr-[40px] md:mr-[56px] ${slotCls}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.logo_url} alt={i < half.length ? c.name : ''} className={logoClsFor(c)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The green band under the alumni title: two drifting rows, or still logos when there are few. */
export default function LogoBand({ companies }: { companies: Company[] }) {
  const logos = useLoadedLogos(companies)
  if (companies.length === 0) return null
  // While probing, keep the band's height so the page below does not jump.
  if (logos === null) return <div aria-hidden className="mt-[clamp(48px,7vw,72px)] h-[136px] bg-pine md:h-[156px]" />
  if (logos.length === 0) return null

  const band = 'mt-[clamp(48px,7vw,72px)] bg-pine py-7 md:py-9'
  if (logos.length < MIN_TO_SCROLL) {
    return (
      <div className={band} aria-label="Companies where our alumni work">
        <ul className="rd-gutter flex flex-wrap items-center justify-center gap-x-[40px] gap-y-4 md:gap-x-[56px]">
          {logos.map(c => (
            <li key={c.id} className={slotCls}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.logo_url} alt={c.name} className={logoClsFor(c)} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const half = Math.ceil(logos.length / 2)
  return (
    <div className={`${band} space-y-5 md:space-y-6`} aria-label="Companies where our alumni work">
      <LogoTrack companies={logos.slice(0, half)} direction="l" seconds={40} />
      <LogoTrack companies={logos.slice(half)} direction="r" seconds={46} />
    </div>
  )
}
