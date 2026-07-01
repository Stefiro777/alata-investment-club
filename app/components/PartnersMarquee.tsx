'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import Reveal from '@/app/components/Reveal'

type PartnerItem = {
  id: string
  name: string
  logo_url: string
  website_url: string | null
}

const FALLBACK_LOGOS: { src: string; url: string | null; id: null }[] = [
  { src: '/syrto2.jpeg', url: 'https://www.syrto.com', id: null },
  { src: '/forbes.png', url: 'https://www.forbesnextleaders.com', id: null },
  { src: '/athenalogo.png', url: null, id: null },
]

function trackClick(partnerId: string) {
  fetch('/api/partners/click', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partnerId }),
  })
}

export default function PartnersMarquee({
  title = 'Our Partners',
  subtitle,
  partners,
}: {
  title?: string
  subtitle?: string
  /** Pass pre-fetched partners to skip the client fetch (e.g. from a Server Component).
   *  If omitted the component fetches on the client. */
  partners?: PartnerItem[]
}) {
  const [resolved, setResolved] = useState<PartnerItem[]>(partners ?? [])

  useEffect(() => {
    // If partners were already supplied at mount time, skip fetch.
    if (partners !== undefined) return
    let isMounted = true
    const fetchData = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('partners')
        .select('id, name, logo_url, website_url, order_index')
        .order('order_index', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
      if (isMounted && data && data.length > 0) setResolved(data as PartnerItem[])
    }
    fetchData()
    return () => { isMounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="py-16 bg-white overflow-hidden">
      <style>{`
        @keyframes partners-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .partners-track {
          animation: partners-scroll 45s linear infinite;
        }
        .partners-viewport:hover .partners-track {
          animation-play-state: paused;
        }
        .partners-viewport {
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
        .partner-logo-item {
          opacity: 0.8;
          transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1);
        }
        .partner-logo-item:hover {
          opacity: 1;
          transform: translateY(-2px);
        }
      `}</style>
      <Reveal direction="up" className="flex flex-col items-center mb-8">
        {subtitle && (
          <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">{subtitle}</p>
        )}
        <h2 className="font-serif text-4xl font-bold text-ink-900">{title}</h2>
        <div className="w-[60px] h-[3px] bg-forest mt-3" />
      </Reveal>
      <Reveal direction="up" delay={200}>
        <div className="partners-viewport overflow-hidden">
          <div className="partners-track flex items-center w-max">
            {resolved.length > 0
              ? [...resolved, ...resolved, ...resolved, ...resolved].map((p, i) => (
                  <div key={i} className="mx-12 h-16 flex items-center">
                    {p.website_url ? (
                      <a
                        href={p.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => trackClick(p.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.logo_url} alt={p.name} className="partner-logo-item h-16 w-auto object-contain max-w-[160px]" />
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.logo_url} alt={p.name} className="partner-logo-item h-16 w-auto object-contain max-w-[160px]" />
                    )}
                  </div>
                ))
              : [...FALLBACK_LOGOS, ...FALLBACK_LOGOS, ...FALLBACK_LOGOS, ...FALLBACK_LOGOS].map((logo, i) => (
                  <div key={i} className="mx-12 h-16 flex items-center">
                    {logo.url ? (
                      <a href={logo.url} target="_blank" rel="noopener noreferrer">
                        {logo.src === '/athenalogo.png'
                          ? <Image src={logo.src} alt="" height={96} width={240} className="partner-logo-item h-24 w-auto object-contain" />
                          : <Image src={logo.src} alt="" height={64} width={160} className="partner-logo-item h-16 w-auto object-contain" />
                        }
                      </a>
                    ) : (
                      logo.src === '/athenalogo.png'
                        ? <Image src={logo.src} alt="" height={96} width={240} className="partner-logo-item h-24 w-auto object-contain" />
                        : <Image src={logo.src} alt="" height={64} width={160} className="partner-logo-item h-16 w-auto object-contain" />
                    )}
                  </div>
                ))
            }
          </div>
        </div>
      </Reveal>
    </section>
  )
}
