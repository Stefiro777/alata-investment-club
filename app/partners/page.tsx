import { createClient } from '@/lib/supabase-server'
import type { Partner } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PartnersPage() {
  const supabase = await createClient()

  const { data: partnersData } = await supabase
    .from('partners')
    .select('id, name, logo_url, website_url, created_at')
    .order('created_at', { ascending: true })

  const partners = (partnersData ?? []) as Partner[]
  const marqueeItems = partners.length > 0
    ? [...partners, ...partners, ...partners, ...partners]
    : []

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#1a4a3a] text-white py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Partnerships</p>
          <h1 className="font-serif text-5xl sm:text-6xl font-bold leading-tight mb-6">
            Partner with Alata
          </h1>
          <div className="w-16 h-px bg-white/30 mb-6" />
          <p className="text-white/70 text-lg sm:text-xl max-w-2xl leading-relaxed">
            Build your brand where the next generation of finance professionals starts.
          </p>
        </div>
      </section>

      {/* Why Partner */}
      <section className="py-20 sm:py-28 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">Collaboration</p>
          <h2 className="font-serif text-4xl font-bold text-[#0a0a0a] mb-2">Why Partner with Us</h2>
          <div className="w-10 h-px bg-[#1a4a3a] mb-12" />
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: 'Access Top Talent',
                body: "Direct access to a curated network of motivated finance students from one of Northern Italy's leading universities.",
              },
              {
                title: 'Brand Visibility',
                body: 'Presence at our events, on our platforms and within our community — reaching students, alumni and professionals in the finance space.',
              },
              {
                title: 'Meaningful Collaboration',
                body: "We don't do generic sponsorships. Every partnership is built around what makes sense for both sides — from guest talks to co-branded initiatives.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="bg-white border border-black/10 p-8">
                <div className="w-8 h-px bg-[#1a4a3a] mb-6" />
                <h3 className="font-serif text-xl font-bold text-[#0a0a0a] mb-3">{title}</h3>
                <p className="text-sm text-[#6b7280] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Current Partners marquee */}
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
        <div className="flex flex-col items-center mb-10">
          <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">Trusted by</p>
          <h2 className="font-serif text-4xl font-bold text-[#0a0a0a]">Our Current Partners</h2>
          <div className="w-[60px] h-[3px] bg-[#1a4a3a] mt-3" />
        </div>
        {marqueeItems.length > 0 ? (
          <div className="overflow-hidden">
            <div className="partners-track flex items-center w-max">
              {marqueeItems.map((p, i) => (
                <div key={i} className="mx-12 h-16 flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.logo_url} alt={p.name} className="h-16 w-auto object-contain max-w-[160px]" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-[#9ca3af]">Partner logos coming soon.</p>
        )}
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-[#1a4a3a] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Get in touch</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Let&rsquo;s Build Something Together
          </h2>
          <div className="w-12 h-px bg-white/30 mx-auto mb-8" />
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Whether you&rsquo;re a financial institution, a company that shares our values, or an organization looking to connect with the next generation of finance talent — we&rsquo;d love to hear from you.
          </p>
          <a
            href="mailto:alatabrixiaic@gmail.com"
            className="inline-block bg-white text-[#1a4a3a] font-medium text-sm tracking-wide px-8 py-4 hover:bg-white/90 transition-colors duration-150"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  )
}
