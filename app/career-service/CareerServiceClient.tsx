'use client'

import Image from 'next/image'
import Reveal from '../components/Reveal'
import Parallax from '../components/Parallax'
import { MotionReveal, MotionLine } from '../components/motion/Motion'
import MentorSection from './MentorSection'

const LINKTREE_URL = 'https://linktr.ee/alatainvestmentclub'

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
                Services designed to accelerate your career in finance — from university orientation to landing your first role in the industry.
              </p>
            </MotionReveal>
          </div>
        </div>
      </section>

      <MentorSection />

      {/* Linktree CTA */}
      <section className="py-20 bg-white border-t border-line">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <Reveal>
            <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-4">Follow us</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mb-4">
              All our links in one place
            </h2>
            <p className="text-ink-500 text-sm leading-relaxed mb-10">
              Follow Alata Investment Club on social media, access our resources, and stay updated on our activities.
            </p>
            <a
              href={LINKTREE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-forest hover:bg-forest-deep text-white text-sm font-medium tracking-wide px-10 py-4 transition-colors duration-fast"
            >
              Visit our Linktree
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
