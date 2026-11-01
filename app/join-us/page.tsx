import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase-server'
import SiteNav from '@/app/components/site/SiteNav'
import SiteFooter from '@/app/components/site/SiteFooter'
import { VeiledMedia, ScrollProgress } from '@/app/components/site/Media'
import { StatusPill } from '@/app/components/site/ui'
import JoinForm from './JoinForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Join Us — Alata Investment Club',
  description: 'Two ways to belong: Analysts who run the club, Members who are in the room.',
  alternates: { canonical: 'https://alatainvestmentclub.com/join-us' },
}

const TEAMS = [
  {
    name: 'Lab',
    tagline: 'Research that leaves the room',
    body: 'Macro, equity and M&A reports, written by you and handed over in person to the companies we know first-hand: Bellini, Borsa Italiana, Ferrari.',
  },
  {
    name: 'Media',
    tagline: 'The voice of the club',
    body: 'The editorial plan, LinkedIn, Instagram and the newsletter, and the merch that carries the name.',
  },
  {
    name: 'Events',
    tagline: 'The rooms we open',
    body: 'Career talks, company visits and days inside the exchange: you plan them, invite the guests and host the day.',
  },
]

const PATHS: { team: string; level?: string; steps: string[] }[] = [
  { team: 'Lab', level: "Bachelor's", steps: ['Academy', 'Interview', 'You are in'] },
  { team: 'Lab', level: "Master's", steps: ['Interview', 'You are in'] },
  { team: 'Media', steps: ['Interview', 'You are in'] },
  { team: 'Events', steps: ['Interview', 'You are in'] },
]

function Closed() {
  return (
    <div>
      <p className="rd-display text-[clamp(32px,3.5vw,44px)]">Applications are closed for now.</p>
      <p className="mt-3 max-w-[460px] text-[15px] leading-[1.7] text-earth-700">
        They open again with the next intake. Follow us on LinkedIn and Instagram to know when.
      </p>
    </div>
  )
}

export default async function JoinUsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase.from('settings').select('key, value').in('key', ['applications_open', 'applications_intake_label'])
  const setting = (k: string) => rows?.find(r => r.key === k)?.value ?? null
  const open = setting('applications_open') === 'true'
  const intake = setting('applications_intake_label')

  return (
    <>
      {/* J1 · two ways to belong */}
      <section className="relative overflow-hidden bg-night text-ivory md:min-h-[100svh]">
        <SiteNav tone="dark" />
        <div className="pointer-events-none relative z-10 px-6 [&_*]:pointer-events-auto pt-[clamp(104px,14vw,110px)] text-center">
          <h1 className="rd-display text-[clamp(52px,8vw,96px)] italic">Two ways to belong</h1>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3.5">
            <StatusPill tone="dark">{open ? 'Open' : 'Closed'}</StatusPill>
            <span className="text-[14px] text-ivory/90">
              {open
                ? intake ? `Applications are open for the ${intake} intake.` : 'Applications are open.'
                : 'Applications are closed for now.'}
            </span>
          </div>
        </div>
        <div className="relative mt-[-240px] grid md:absolute md:inset-0 md:mt-0 md:grid-cols-2">
          {[
            { id: 'analysts', eyebrow: 'Operating members', title: <>Analysts.<br /><em>Write the research.</em></>, body: 'Join the Lab, Media or Events. Learn by doing, and watch your work reach real rooms.', cta: 'Become an Analyst', img: '/redesign/join-analyst.jpg' },
            { id: 'members', eyebrow: 'Non-operating members', title: <>Members.<br /><em>Be in the room.</em></>, body: 'Every event and every conversation, for those who want to belong without running the club.', cta: 'Become a Member', img: '/redesign/join-member.jpg' },
          ].map((side, i) => (
            <div key={side.id} className={`relative flex min-h-[560px] flex-col justify-end px-[var(--gutter)] pb-14 md:min-h-0 md:pt-[300px] ${i === 0 ? 'pt-[340px]' : 'pt-[220px]'}`}>
              <VeiledMedia image={side.img} opacity={0.74} />
              {i === 1 && <span aria-hidden className="absolute bottom-0 left-0 hidden h-[61%] w-px bg-ivory/30 md:block" />}
              <div className="relative">
                <div className="rd-eyebrow text-[11px] text-ivory/70">{side.eyebrow}</div>
                <h2 className="rd-display mt-3 text-[clamp(40px,4.7vw,56px)] leading-[1.12]">{side.title}</h2>
                <p className="mt-6 max-w-[400px] text-[15px] leading-[1.7] text-ivory/[0.88]">{side.body}</p>
                <a href={`#${side.id}`} className="rd-italic mt-10 inline-block text-[clamp(32px,3.3vw,40px)] leading-[1.2] hover:underline underline-offset-[0.18em]">{side.cta}</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* J2 · what Analysts do */}
      <section id="analysts" className="bg-pine py-[clamp(72px,9vw,110px)] text-ivory">
        <div className="rd-gutter">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="rd-display text-[clamp(64px,8.7vw,104px)] leading-[1.12]">Analysts</h2>
              <p className="mt-4 max-w-[500px] text-[18px] leading-[1.7] text-ivory/[0.86]">You don&apos;t watch the club happen. You make it.</p>
            </div>
            <a href="#apply-analyst" className="inline-flex items-center gap-2.5 self-start rounded-full border border-ivory/70 px-[30px] py-[15px] text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-ivory/10 md:mt-12">
              Apply as an Analyst <span aria-hidden className="text-[16px] tracking-normal">&rarr;</span>
            </a>
          </div>
          <div className="mt-14 grid gap-12 md:grid-cols-3 md:gap-16">
            {TEAMS.map(t => (
              <div key={t.name} className="border-t border-ivory/40 pt-[22px]">
                <div className="rd-display text-[52px]">{t.name}</div>
                <div className="rd-italic mt-1.5 text-[22px] leading-[1.3] text-ivory/75">{t.tagline}</div>
                <p className="mt-3.5 text-[14px] leading-[1.7] text-ivory/85">{t.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col gap-3 border-t border-ivory/25 pt-5 md:flex-row md:items-baseline md:justify-between">
            {['Learn by doing', 'Reports delivered in person', 'Discounts on event tickets and merch'].map(x => (
              <span key={x} className="rd-italic text-[26px]">{x}</span>
            ))}
          </div>
        </div>
      </section>

      {/* J3 · the way in, by team */}
      <section className="bg-ivory py-[clamp(72px,9vw,100px)] text-night">
        <div className="rd-gutter">
          <h2 className="rd-display text-[clamp(48px,5.4vw,64px)] italic leading-[1.12]">Your way in</h2>
          <ul className="mt-10 space-y-10 md:space-y-8">
            {PATHS.map(p => (
              <li key={`${p.team}-${p.level ?? ''}`} className="grid gap-4 md:grid-cols-[344px_minmax(0,1fr)] md:items-start">
                <div className="flex items-baseline gap-4 md:block">
                  <div className="rd-display text-[clamp(40px,4.3vw,52px)] text-club">{p.team}</div>
                  {p.level && <div className="rd-italic text-[clamp(24px,2.5vw,30px)] leading-[1.12]">{p.level}</div>}
                </div>
                <ol className="relative grid max-w-[650px] gap-4 md:mt-[62px]" style={{ gridTemplateColumns: `repeat(${p.steps.length}, minmax(0, 230px))` }}>
                  <span aria-hidden className="absolute left-0 top-[8px] h-px bg-night" style={{ width: `calc(${(p.steps.length - 1) / p.steps.length * 100}% + 8px)` }} />
                  {p.steps.map((s, i) => (
                    <li key={s} className="relative">
                      <span aria-hidden className="mb-[18px] block h-4 w-4 rounded-full bg-night" />
                      <div className="rd-eyebrow text-[10px] text-earth-500">Step {i + 1}</div>
                      <div className="rd-display mt-1 text-[clamp(22px,2.5vw,30px)] leading-[1.12]">{s}</div>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* J4 · Analyst application */}
      <section id="apply-analyst" className="scroll-mt-4 border-t border-night/15 bg-ivory py-[clamp(72px,9vw,100px)] text-night">
        <div className="rd-gutter grid gap-10 md:grid-cols-[minmax(0,400px)_minmax(0,644px)] md:justify-between">
          <div>
            <h2 className="rd-display text-[clamp(52px,6vw,72px)] leading-[1.12]">Apply as an <em>Analyst</em></h2>
            <p className="mt-8 max-w-[380px] text-[15px] leading-[1.7] text-earth-700">
              Tell us who you are, what you study and where you would like to start. The Academy is only for the Lab. For Media and Events you go straight to the interview, and Master&apos;s applicants skip the Academy. We reply by email.
            </p>
          </div>
          {open ? <JoinForm track="analyst" /> : <Closed />}
        </div>
      </section>

      {/* J5 · Members */}
      <section id="members" className="bg-moss py-[clamp(72px,9vw,110px)] text-ivory">
        <div className="rd-gutter">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="rd-display text-[clamp(64px,8.7vw,104px)] leading-[1.12]">Members</h2>
              <p className="mt-4 max-w-[520px] text-[18px] leading-[1.7] text-ivory/[0.86]">You don&apos;t need to run the club to be part of it.</p>
            </div>
            <a href="#apply-member" className="inline-flex items-center gap-2.5 self-start rounded-full border border-ivory/70 px-[30px] py-[15px] text-[12px] font-semibold uppercase tracking-[0.14em] hover:bg-ivory/10 md:mt-12">
              Become a Member <span aria-hidden className="text-[16px] tracking-normal">&rarr;</span>
            </a>
          </div>
          <div className="mt-14 grid gap-14 md:grid-cols-[minmax(0,520px)_minmax(0,444px)] md:justify-between">
            <div className="space-y-6">
              {[
                ['Every event', 'Talks with founders and CEOs, company visits, days inside the exchange.'],
                ['The people', 'Students, alumni and speakers, in the same room.'],
                ['Your card', 'A digital membership card with a QR code, valid for the year.'],
              ].map(([t, b]) => (
                <div key={t} className="border-t border-ivory/30 pt-4">
                  <div className="rd-display text-[30px] leading-[1.12]">{t}</div>
                  <div className="mt-1.5 text-[14px] leading-[1.65] text-ivory/85">{b}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="rd-eyebrow text-[11px] text-ivory/70">How it works</div>
              <ol className="mt-5 space-y-6">
                {[
                  ['Send your request', 'A few lines about you.'],
                  ['We check the fit', 'We read every request. We want the right people in the room.'],
                  ['Pay the annual fee', 'Same as for Analysts, renewed every year. Then your card arrives.'],
                ].map(([t, b], i) => (
                  <li key={t} className="grid grid-cols-[48px_minmax(0,1fr)] items-baseline">
                    <span className="rd-italic rd-num text-[36px] leading-[1.12]">{i + 1}</span>
                    <div>
                      <div className="rd-display text-[32px] leading-[1.12]">{t}</div>
                      <div className="mt-1 text-[14px] leading-[1.6] text-ivory/85">{b}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* J6 · Member request */}
      <section id="apply-member" className="scroll-mt-4 bg-ivory py-[clamp(72px,9vw,100px)] text-night">
        <div className="rd-gutter grid gap-10 md:grid-cols-[minmax(0,400px)_minmax(0,644px)] md:justify-between">
          <div>
            <h2 className="rd-display text-[clamp(52px,6vw,72px)] leading-[1.12]">Become a <em>Member</em></h2>
            <p className="mt-8 max-w-[380px] text-[15px] leading-[1.7] text-earth-700">Tell us a little about you. No CV needed.</p>
            <p className="mt-4 max-w-[380px] text-[13px] leading-[1.7] text-earth-500">
              We review every request. If it is a good fit, you receive the payment link for the annual fee and your membership card.
            </p>
          </div>
          {open ? <JoinForm track="member" /> : <Closed />}
        </div>
      </section>

      <SiteFooter />
      <ScrollProgress />
    </>
  )
}
