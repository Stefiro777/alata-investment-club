import type { Metadata } from 'next'
import Image from 'next/image'
import { createClient } from '@/lib/supabase-server'
import Reveal from '@/app/components/Reveal'
import FeaturedGallery from '@/app/components/FeaturedGallery'
import type { FeaturedGalleryItem, Partner, PartnerDocument } from '@/lib/types'
import SponsorDocumentList from './SponsorDocumentList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: 'https://alatainvestmentclub.com/partners' },
}

// ── Shared grid ───────────────────────────────────────────────────────────────

function PartnersGrid({
  partners,
  subtitle,
  title,
  bg = 'bg-white',
}: {
  partners: Partner[]
  subtitle: string
  title: string
  bg?: string
}) {
  if (partners.length === 0) return null
  return (
    <section className={`py-20 sm:py-28 ${bg}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal direction="up">
          <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">{subtitle}</p>
          <h2 className="font-serif text-4xl font-bold text-ink-900 mb-2">{title}</h2>
          <div className="w-10 h-px bg-forest mb-12" />
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((p, i) => (
            <Reveal key={p.id} direction="up" delay={i * 80} className="h-full">
              {p.website_url ? (
                <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="block h-full">
                  <PartnerCard partner={p} />
                </a>
              ) : (
                <PartnerCard partner={p} />
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className="group bg-white border border-line-faint p-8 hover-lift h-full flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={partner.logo_url}
        alt={partner.name}
        className="h-12 w-auto object-contain mb-6 self-start grayscale group-hover:grayscale-0 transition-[filter] duration-base"
      />
      <div className="w-8 h-px bg-forest mb-4" />
      <h3 className="font-serif text-lg font-bold text-ink-900 mb-3">{partner.name}</h3>
      {partner.description && (
        <p className="text-sm text-ink-500 leading-relaxed flex-1">{partner.description}</p>
      )}
    </div>
  )
}

function SponsorCard({ partner, documents }: { partner: Partner; documents: PartnerDocument[] }) {
  return (
    <div className="group bg-white border border-line-faint p-8 hover-lift h-full flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={partner.logo_url}
        alt={partner.name}
        className="h-12 w-auto object-contain mb-6 self-start grayscale group-hover:grayscale-0 transition-[filter] duration-base"
      />
      <div className="w-8 h-px bg-forest mb-4" />
      <h3 className="font-serif text-lg font-bold text-ink-900 mb-3">{partner.name}</h3>
      {partner.description && (
        <p className="text-sm text-ink-500 leading-relaxed">{partner.description}</p>
      )}
      <SponsorDocumentList documents={documents} />
    </div>
  )
}

export default async function PartnersPage() {
  const supabase = await createClient()
  const [{ data: allPartners }, { data: featuredPartners }] = await Promise.all([
    supabase
      .from('partners')
      .select('id, name, logo_url, website_url, description, type, order_index, click_count, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase
      .from('featured_partners')
      .select('id, title, description, authors, media, display_order')
      .order('display_order', { ascending: true }),
  ])

  const partners = (allPartners ?? []) as Partner[]
  const sponsors = partners.filter(p => p.type === 'sponsor' || !p.type)
  const strategicPartners = partners.filter(p => p.type === 'partner')

  // Fetch documents for sponsors
  const sponsorIds = sponsors.map(s => s.id)
  let sponsorDocs: PartnerDocument[] = []
  if (sponsorIds.length > 0) {
    const { data: docsData } = await supabase
      .from('partner_documents')
      .select('id, partner_id, name, file_url, preview_count, created_at')
      .in('partner_id', sponsorIds)
      .order('created_at', { ascending: true })
    sponsorDocs = (docsData ?? []) as PartnerDocument[]
  }
  const docsByPartner: Record<string, PartnerDocument[]> = {}
  for (const doc of sponsorDocs) {
    if (!docsByPartner[doc.partner_id]) docsByPartner[doc.partner_id] = []
    docsByPartner[doc.partner_id].push(doc)
  }

  return (
    <div>
      {/* Hero — split screen: forest panel + Brescia Due towers */}
      <section className="relative grid lg:grid-cols-2 text-white overflow-hidden">
        {/* Left — content */}
        <div className="bg-forest flex items-center py-20 sm:py-28 lg:min-h-[640px]">
          <div className="w-full max-w-2xl lg:ml-auto px-6 lg:pl-8 lg:pr-16">
            <p className="animate-hero-line text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Partnerships</p>
            <h1 className="animate-hero-title font-serif text-5xl sm:text-6xl font-bold mb-6">
              Partner with Alata
            </h1>
            <div className="animate-hero-line w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-xl leading-relaxed mb-10"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.45s both' }}>
              Build your brand where the next generation of finance professionals starts.
            </p>
            <a
              href="mailto:info@alatainvestmentclub.com"
              className="inline-block border border-white/40 text-white text-xs font-semibold tracking-[0.2em] uppercase px-10 py-4 hover:bg-white hover:text-forest hover:border-white transition-colors duration-base"
              style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.6s both' }}
            >
              Start a Conversation
            </a>
          </div>
        </div>
        {/* Right — towers photo */}
        <div className="relative min-h-[340px] lg:min-h-0" style={{ animation: 'heroFadeIn 1.1s ease 0.2s both' }}>
          <Image
            src="/redesign/brescia-due-hd.jpg"
            fill
            alt="Brescia Due towers at dusk"
            className="object-cover grayscale"
            style={{ objectPosition: 'center 35%' }}
            preload
          />
          <div className="absolute inset-0" style={{ background: 'rgba(26,74,58,0.45)' }} />
          <p className="absolute bottom-5 right-6 text-[10px] tracking-[0.3em] uppercase text-white/60">
            Brescia Due · Business District
          </p>
        </div>
      </section>

      {/* Why Partner */}
      <section className="py-20 sm:py-28 bg-[#f5f5f0]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <Reveal direction="up">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Collaboration</p>
            <h2 className="font-serif text-4xl font-bold text-ink-900 mb-2">Why Partner with Us</h2>
            <div className="w-10 h-px bg-forest mb-12" />
          </Reveal>
          <div className="grid sm:grid-cols-3 gap-6 items-stretch">
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
            ].map(({ title, body }, i) => (
              <Reveal key={title} direction="up" delay={i * 120} className="h-full">
                <div className="relative bg-white border border-line-faint p-8 hover-lift h-full overflow-hidden">
                  <span
                    className="absolute -right-2 -bottom-8 font-serif text-[7rem] leading-none text-forest/[0.06] select-none pointer-events-none"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="w-8 h-px bg-forest mb-6" />
                  <h3 className="font-serif text-xl font-bold text-ink-900 mb-3">{title}</h3>
                  <p className="text-sm text-ink-500 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Partners Gallery */}
      <FeaturedGallery
        items={(featuredPartners ?? []) as FeaturedGalleryItem[]}
        sectionLabel="Partner Spotlight"
        title="Partner Spotlights"
        subtitle="In Evidence"
      />

      {/* Strategic Partners */}
      <PartnersGrid partners={strategicPartners} subtitle="Strategic" title="Partners" bg="bg-white" />

      {/* Sponsors */}
      {sponsors.length > 0 && (
        <section className="py-20 sm:py-28 bg-[#f5f5f0]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <Reveal direction="up">
              <p className="text-xs tracking-[0.2em] uppercase text-ink-400 mb-3">Supported by</p>
              <h2 className="font-serif text-4xl font-bold text-ink-900 mb-2">Sponsors</h2>
              <div className="w-10 h-px bg-forest mb-12" />
            </Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sponsors.map((p, i) => (
                <Reveal key={p.id} direction="up" delay={i * 80} className="h-full">
                  {p.website_url ? (
                    <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="block h-full">
                      <SponsorCard partner={p} documents={docsByPartner[p.id] ?? []} />
                    </a>
                  ) : (
                    <SponsorCard partner={p} documents={docsByPartner[p.id] ?? []} />
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-forest text-white">
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
            href="mailto:info@alatainvestmentclub.com"
            className="inline-block bg-white text-forest font-medium text-sm tracking-wide px-8 py-4 hover:bg-white/90 transition-colors duration-fast"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  )
}
