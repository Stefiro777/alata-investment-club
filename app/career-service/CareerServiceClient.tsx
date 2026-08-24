'use client'

import Image from 'next/image'
import Parallax from '../components/Parallax'
import { MotionReveal, MotionLine } from '../components/motion/Motion'
import MentorSection from './MentorSection'

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
    </div>
  )
}
