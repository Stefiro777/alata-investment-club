import Link from 'next/link'
import { VeiledMedia } from '@/app/components/site/Media'
import { StatusPill } from '@/app/components/site/ui'
import type { AboutStat } from '@/lib/about-stats'
import { shortDate } from '@/lib/event-display'

export type HomeEvent = { id: string; slug: string | null; title: string; date: string; status: string | null }

const VALUES = ['Community', 'Drive', 'Ambition'] as const

/**
 * The About page (home): plain sections stacked one under the other, like
 * /team and /reports. Nothing here reacts to the scroll.
 */
export default function AboutSections({
  nav,
  stats,
  events,
  credits,
}: {
  nav: React.ReactNode
  stats: AboutStat[]
  events: HomeEvent[]
  credits: string[]
}) {
  return (
    <>
      {/* The loop */}
      <section className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-night text-ivory">
        <VeiledMedia video="/redesign/home-loop.mp4" poster="/redesign/home-loop-poster.jpg" opacity={0.48} priority />
        <div className="absolute inset-x-0 top-0 z-10">{nav}</div>
        <h1 className="relative whitespace-nowrap pb-[28px] text-center font-serif text-[25vw] font-medium leading-none tracking-[-0.02em]">
          ALATA
        </h1>
      </section>

      {/* The vision */}
      <section className="bg-pine text-ivory">
        <div className="rd-gutter grid gap-10 py-[clamp(72px,9vw,112px)] md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-12">
          <div className="flex flex-col justify-between gap-8">
            <p className="rd-display max-w-[600px] text-[clamp(32px,5.6vw,68px)] leading-[1.24]">
              A community where ambition meets opportunity, <em>regardless of where you start.</em>
            </p>
            <p className="max-w-[420px] text-[15px] leading-[1.65] text-ivory/85">
              The first finance club of the University of Brescia. Students who learn from bankers and investors, and publish their own research.
            </p>
          </div>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/redesign/borsa-insegna.jpg" alt="The spiral staircase at Borsa Italiana, Milan" className="aspect-[4/5] w-full object-cover" />
            <figcaption className="rd-italic mt-3.5 text-[16px] text-ivory/75">Borsa Italiana, Milan</figcaption>
          </figure>
        </div>
      </section>

      {/* The values */}
      <section className="relative overflow-hidden bg-night text-ivory">
        <VeiledMedia image="/redesign/workshop-valori.jpg" opacity={0.7} />
        <div className="rd-gutter relative flex flex-col items-center py-[clamp(72px,9vw,112px)] text-center">
          {VALUES.map((word, i) => (
            <div key={word} className={`rd-display text-[clamp(60px,11.3vw,136px)] leading-[1.2] ${i === 1 ? 'italic' : ''}`}>
              {word}
            </div>
          ))}
          <p className="mt-8 max-w-[640px] text-[16px] leading-[1.6] text-ivory/90">
            Taking initiative isn&apos;t a buzzword here, it&apos;s the entry requirement.
          </p>
          <div className="rd-italic mt-[clamp(40px,6vw,72px)] text-[16px] text-ivory/75">
            Forbes Next Leaders × EssilorLuxottica, Milan
          </div>
        </div>
      </section>

      {/* The numbers */}
      <section className="relative overflow-hidden bg-night text-ivory">
        <VeiledMedia video="/redesign/pbd-palco.mp4" poster="/redesign/pbd-palco-poster.jpg" veil="#12352a" opacity={0.78} />
        <div className="rd-gutter relative py-[clamp(72px,9vw,112px)]">
          <dl className="grid grid-cols-2 gap-x-[clamp(16px,4vw,48px)] gap-y-[clamp(32px,5vw,64px)]">
            {stats.map(s => (
              <div key={s.label}>
                <dt className="mb-1.5 text-[13px] tracking-[0.04em] text-ivory/90">{s.label}</dt>
                <dd className="whitespace-nowrap font-serif text-[clamp(64px,13.3vw,200px)] font-semibold leading-[0.9] tracking-[-0.02em]">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="rd-italic mt-[clamp(40px,6vw,72px)] text-right text-[16px] text-ivory/75">Private Banker Day</div>
        </div>
      </section>

      {/* Next up */}
      <section className="bg-ivory text-night">
        <div className="rd-gutter grid gap-10 py-[clamp(72px,9vw,112px)] md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-16">
          <figure className="hidden md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/redesign/borsa-pubblico.jpg" alt="A talk at Borsa Italiana" className="aspect-[3/4] w-full object-cover" />
            <figcaption className="rd-italic mt-3 text-[16px] text-earth-700">Inside the Markets, Borsa Italiana</figcaption>
          </figure>
          <div>
            <h2 className="rd-display text-[clamp(44px,5.3vw,64px)]">Next up</h2>
            {events.length > 0 ? (
              <ul className="mt-5 border-t border-night">
                {events.map(ev => (
                  <li key={ev.id}>
                    <Link
                      href={ev.slug ? `/events/${ev.slug}` : '/events'}
                      className="grid min-h-[96px] grid-cols-[64px_minmax(0,1fr)] items-center gap-x-4 border-b border-night/25 py-3 transition-colors hover:bg-night/[0.03] sm:grid-cols-[minmax(110px,190px)_minmax(0,1fr)_auto] sm:gap-x-5"
                    >
                      <span className="rd-display text-[26px] leading-[1.1] sm:text-[clamp(30px,4.2vw,50px)]">{shortDate(ev.date)}</span>
                      <span className="text-[15px] leading-[1.35] md:text-[18px]">{ev.title}</span>
                      <span className="col-start-2 mt-2 justify-self-start sm:col-start-auto sm:mt-0 sm:justify-self-end">
                        <StatusPill solid={ev.status === 'open'}>{ev.status === 'open' ? 'Open' : 'Soon'}</StatusPill>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rd-italic mt-8 text-[28px] text-earth-700">New dates are on their way.</p>
            )}
          </div>
        </div>
      </section>

      {/* In good company */}
      <section className="relative overflow-hidden bg-night text-ivory">
        <VeiledMedia image="/redesign/borsa-sala.jpg" opacity={0.72} />
        <div className="rd-gutter relative py-[clamp(72px,9vw,112px)] text-center">
          <p className="rd-italic text-[clamp(26px,2.8vw,34px)]">In good company</p>
          <ul className="mt-[clamp(32px,5vw,56px)] flex flex-col items-center gap-[clamp(18px,3vh,30px)]">
            {credits.map(name => (
              <li key={name} className="rd-display px-6 text-[clamp(30px,4vw,48px)]">{name}</li>
            ))}
          </ul>
          <div className="rd-italic mt-[clamp(40px,6vw,72px)] text-right text-[16px] text-ivory/60">Inside the Markets, Borsa Italiana</div>
        </div>
      </section>

      {/* The finale */}
      <section className="relative overflow-hidden bg-night text-ivory">
        <VeiledMedia video="/redesign/home-loop.mp4" poster="/redesign/home-loop-poster.jpg" opacity={0.6} />
        <div className="rd-gutter relative flex flex-col items-center pt-[clamp(72px,9vw,112px)] text-center">
          <p className="rd-display max-w-[900px] text-[clamp(32px,7vw,84px)]">
            You bring the ambition.<br /><em>We bring the wings.</em>
          </p>
          <Link href="/join-us" className="rd-italic mt-4 text-[clamp(30px,4.5vw,54px)] underline-offset-[0.18em] hover:underline">
            Join the Club
          </Link>
          <div aria-hidden className="mt-[clamp(40px,6vw,72px)] whitespace-nowrap pb-[28px] font-serif text-[25vw] font-medium leading-[0.9] tracking-[-0.01em]">
            ALATA
          </div>
        </div>
      </section>
    </>
  )
}
