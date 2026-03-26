import Image from 'next/image'
import PartnersMarquee from '@/app/components/PartnersMarquee'

export const dynamic = 'force-dynamic'

export default function PartnersPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[650px] text-white flex items-center overflow-hidden">
        <Image
          src="/teatro.jpg"
          fill
          alt="Teatro"
          className="object-cover grayscale"
          style={{ objectPosition: 'center 70%' }}
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Partnerships</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold mb-6">
              Partner with Alata
            </h1>
            <div className="w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Build your brand where the next generation of finance professionals starts.
            </p>
          </div>
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

      {/* Current Partners — shared component, same data as homepage */}
      <PartnersMarquee title="Our Current Partners" subtitle="Trusted by" />

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
