'use client'

import Image from 'next/image'
import Parallax from '../components/Parallax'
import { MotionReveal, MotionLine } from '../components/motion/Motion'
import Link from 'next/link'
import Reveal from '../components/Reveal'
import MentorSection from './MentorSection'

// How the service works — mirrors the real booking flow (MentorBookingOverlay):
// pick a mentor, choose a slot from their availability, pay online (free for
// active members). Sessions are 30 minutes.
const STEPS = [
  {
    title: 'Choose your mentor',
    body: 'Each mentor is a former or current member of the club working in the industry. Read their profile and pick the one closest to the path you want to follow.',
  },
  {
    title: 'Book a 30-minute session',
    body: 'See the mentor’s real availability, select a slot and tell us what you want to work on, so the session starts from your goals and not from scratch.',
  },
  {
    title: 'Get specific, actionable feedback',
    body: 'A one-to-one conversation with practical next steps: what to fix in your CV, how to approach an interview, which master or role fits your profile.',
  },
]

// What members get: only what matters to someone looking for a career in finance.
// Internal material (documents, partner programmes) is intentionally left out.
const MEMBER_ACCESS = [
  {
    title: 'Free career sessions',
    body: 'Active members book 30-minute one-to-one sessions with club mentors at no cost. Everyone else pays per session.',
  },
  {
    title: 'A job board for finance students',
    body: 'Internships and entry-level roles from the club network, plus openings shared by members. Apply on the platform and get an email when something new is posted.',
  },
  {
    title: 'Master and recruiting resources',
    body: 'Curated folders to choose the right master and prepare for recruiting processes, organised by topic and always one click away.',
  },
]

function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="mb-14 max-w-2xl mx-auto text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">How it works</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">
              One-to-one guidance from people who have done it
            </h2>
            <div className="w-10 h-px bg-forest mx-auto mb-6" />
            <p className="text-ink-500 text-sm leading-relaxed">
              Career Service connects students and young professionals with club alumni and members already working in finance.
              Sessions are short and focused on a single objective, so you leave with concrete steps instead of general advice.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 80} direction="up" className="h-full">
              <div className="h-full bg-white border border-forest p-8 text-center">
                <p className="font-serif text-5xl font-semibold text-forest/30 leading-none mb-6">0{i + 1}</p>
                <h3 className="font-serif text-xl font-bold text-ink-900 mb-3">{step.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function MemberSnapshot() {
  return (
    <section className="py-20 sm:py-28 bg-white border-t border-line">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="mb-14 max-w-2xl mx-auto text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">Member access</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">What members get</h2>
            <div className="w-10 h-px bg-forest mx-auto mb-6" />
            <p className="text-ink-500 text-sm leading-relaxed">
              Career Service is one part of the club. Membership adds three things that help you move faster.
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6">
          {MEMBER_ACCESS.map((item, i) => (
            <Reveal key={item.title} delay={i * 60} direction="up" className="h-full">
              <div className="h-full bg-white border border-forest border-t-4 p-8 text-center">
                <h3 className="font-serif text-xl font-bold text-ink-900 mb-3">{item.title}</h3>
                <div className="w-8 h-px bg-forest/40 mx-auto mb-4" />
                <p className="text-sm text-ink-500 leading-relaxed">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 text-center">
            <Link
              href="/join-us"
              className="inline-block bg-forest text-white text-xs font-semibold tracking-[0.2em] uppercase px-10 py-4 hover:bg-forest-deep transition-colors duration-fast"
            >
              Join the Club
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

export default function CareerServiceClient() {
  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[610px] text-white flex items-center overflow-hidden">
        <Parallax>
          <Image src="/vittoria.jpeg" alt="" fill className="object-cover object-top grayscale animate-ken-burns" preload />
        </Parallax>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="absolute inset-0 hero-vignette" />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <MotionReveal delay={0} y={20}>
              <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">Professional support</p>
            </MotionReveal>
            <MotionReveal delay={0.15}>
              <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
                Career Service
              </h1>
            </MotionReveal>
            <MotionLine delay={0.35} duration={0.8} className="w-12 h-px bg-white/30 mb-6" />
            <MotionReveal delay={0.45}>
              <p className="text-white/70 text-base max-w-2xl leading-relaxed">
                Services designed to accelerate your career in finance, from university orientation to landing your first role in the industry.
              </p>
            </MotionReveal>
          </div>
        </div>
      </section>

      <HowItWorks />
      <MentorSection />
      <MemberSnapshot />
    </div>
  )
}
