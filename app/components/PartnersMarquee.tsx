import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'

const FALLBACK_LOGOS = ['/syrto2.jpeg', '/forbes.png', '/athenalogo.png']

export default async function PartnersMarquee({
  title = 'Our Partners',
  subtitle,
}: {
  title?: string
  subtitle?: string
}) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('partners')
    .select('id, name, logo_url')
    .order('order_index', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  const partners = (data ?? []) as { id: string; name: string; logo_url: string }[]

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo_url} alt={p.name} className="h-16 w-auto object-contain max-w-[160px]" />
                </div>
              ))
            : [...FALLBACK_LOGOS, ...FALLBACK_LOGOS, ...FALLBACK_LOGOS, ...FALLBACK_LOGOS].map((src, i) => (
                <div key={i} className="mx-12 h-16 flex items-center">
                  {src === '/athenalogo.png'
                    ? <Image src={src} alt="" height={96} width={240} className="h-24 w-auto object-contain" />
                    : <Image src={src} alt="" height={64} width={160} className="h-16 w-auto object-contain" />
                  }
                </div>
              ))
          }
        </div>
      </div>
    </section>
  )
}
