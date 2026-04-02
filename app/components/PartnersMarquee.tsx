'use client'

import Image from 'next/image'

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
  partners = [],
}: {
  title?: string
  subtitle?: string
  partners?: PartnerItem[]
}) {
  return (
    <section className="py-16 bg-white overflow-hidden">
      <style>{`
        @keyframes partners-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .partners-track {
          animation: partners-scroll 30s linear infinite;
        }
      `}</style>
      <div className="flex flex-col items-center mb-8">
        {subtitle && (
          <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">{subtitle}</p>
        )}
        <h2 className="font-serif text-4xl font-bold text-[#0a0a0a]">{title}</h2>
        <div className="w-[60px] h-[3px] bg-[#1a4a3a] mt-3" />
      </div>
      <div className="overflow-hidden">
        <div className="partners-track flex items-center w-max">
          {partners.length > 0
            ? [...partners, ...partners, ...partners, ...partners].map((p, i) => (
                <div key={i} className="mx-12 h-16 flex items-center">
                  {p.website_url ? (
                    <a
                      href={p.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick(p.id)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.logo_url} alt={p.name} className="h-16 w-auto object-contain max-w-[160px]" />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo_url} alt={p.name} className="h-16 w-auto object-contain max-w-[160px]" />
                  )}
                </div>
              ))
            : [...FALLBACK_LOGOS, ...FALLBACK_LOGOS, ...FALLBACK_LOGOS, ...FALLBACK_LOGOS].map((logo, i) => (
                <div key={i} className="mx-12 h-16 flex items-center">
                  {logo.url ? (
                    <a href={logo.url} target="_blank" rel="noopener noreferrer">
                      {logo.src === '/athenalogo.png'
                        ? <Image src={logo.src} alt="" height={96} width={240} className="h-24 w-auto object-contain" />
                        : <Image src={logo.src} alt="" height={64} width={160} className="h-16 w-auto object-contain" />
                      }
                    </a>
                  ) : (
                    logo.src === '/athenalogo.png'
                      ? <Image src={logo.src} alt="" height={96} width={240} className="h-24 w-auto object-contain" />
                      : <Image src={logo.src} alt="" height={64} width={160} className="h-16 w-auto object-contain" />
                  )}
                </div>
              ))
          }
        </div>
      </div>
    </section>
  )
}
