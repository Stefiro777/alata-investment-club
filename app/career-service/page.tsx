import type { Metadata } from 'next'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { VeiledMedia, ScrollProgress } from '@/app/components/site/Media'
import { ItalicLink } from '@/app/components/site/ui'
import MentorSection from './MentorSection'

export const metadata: Metadata = {
  title: 'Career Service — Alata Investment Club',
  description: 'One-to-one sessions of thirty minutes with mentors who have already been where you want to go.',
  alternates: { canonical: 'https://alatainvestmentclub.com/career-service' },
}

export default function CareerServicePage() {
  return (
    <>
      {/* C1 · opening */}
      <section className="relative flex min-h-[100svh] flex-col overflow-hidden bg-pine text-ivory">
        <VeiledMedia image="/redesign/career-hero.jpg" opacity={0.66} priority />
        <SiteNav tone="dark" />
        <div className="rd-gutter relative flex flex-1 flex-col justify-center pb-16 pt-28">
          <h1 className="rd-display text-[clamp(72px,11.3vw,136px)] leading-[1.1]">Career<br /><em>Service</em></h1>
          <p className="mt-10 max-w-[440px] text-[16px] leading-[1.7] text-ivory/[0.86]">
            One-to-one sessions of thirty minutes with our mentors, who have already been where you want to go.
          </p>
          <a href="#mentors" className="rd-italic mt-8 self-start text-[30px] hover:underline underline-offset-[0.18em]">Meet the mentors</a>
        </div>
      </section>

      <MentorSection />

      <section className="bg-night py-[clamp(64px,8vw,90px)] text-center text-ivory">
        <p className="rd-display mx-auto max-w-[760px] px-6 text-[clamp(32px,4vw,48px)]">
          Members book for free, and find job offers and resources in their area.
        </p>
        <ItalicLink href="/join-us" size="lg" className="mt-6">Join the club</ItalicLink>
      </section>

      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
