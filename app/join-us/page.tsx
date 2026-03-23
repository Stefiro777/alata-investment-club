import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import ApplySection from './ApplySection'


const researchTopics = [
  { title: 'Equity Research', desc: 'In-depth analysis of listed companies and investment theses.' },
  { title: 'M&A Analysis', desc: 'Deal structuring, synergies and valuation in corporate transactions.' },
  { title: 'Macro Reports', desc: 'Thematic research on macroeconomic trends and their market impact.' },
  { title: 'Earnings Breakdowns', desc: 'Quarterly results analysis and forward-looking commentary.' },
]

export default async function JoinUsPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'applications_open')
    .maybeSingle()

  const applicationsOpen = settings?.value === 'true'

  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <section className="relative py-24 px-6">
        <Image
          src="/piazzavittoria.jpeg"
          alt="Piazza Vittoria"
          fill
          className="object-cover grayscale"
          style={{ objectPosition: 'center 70%' }}
          priority
        />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="text-xs tracking-widest uppercase text-white/60 mb-4">Join Us</p>
          <h1 className="font-serif text-5xl font-bold text-white leading-tight">
            Become a Member
          </h1>
          <div className="w-10 h-px bg-white/30 mt-4 mb-6" />
          <p className="text-white/80 text-lg max-w-xl leading-relaxed">
            Join a meritocratic, collaborative environment where ambition meets finance.
          </p>
        </div>
      </section>

      {/* ── Step 01: Academy ── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-widest uppercase text-[#6b7280] mb-3">Step 01</p>
          <h2 className="font-serif text-3xl font-bold text-[#0a0a0a]">Academy</h2>
          <div className="w-10 h-px bg-[#1a4a3a] mt-3 mb-6" />
          <p className="text-[#374151] text-sm leading-relaxed max-w-2xl">
            The Academy is the entry point into Alata Investment Club. Through a series of
            progressive tests covering accounting, valuation, macroeconomics and financial
            markets, candidates develop the foundational skills needed to contribute to the
            club. No prior experience required — curiosity, commitment and rigour are enough.
          </p>
        </div>
      </section>

      {/* ── Step 02: Gruppo Syrto ── */}
      <section className="bg-[#f9f9f7] py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          {/* Left — partnership card */}
          <div className="bg-[#1a4a3a] text-white p-8 flex flex-col items-center justify-center">
            <p className="text-xs tracking-widest uppercase text-white/60 text-center mb-4">
              In partnership with
            </p>
            <Image
              src="/syrto2.jpeg"
              alt="Syrto"
              width={200}
              height={64}
              className="object-contain h-16 mx-auto"
            />
            <p className="text-white/80 text-sm text-center mt-4">
              Syrto — Financial Intelligence
            </p>
          </div>

          {/* Right — text */}
          <div>
            <p className="text-xs tracking-widest uppercase text-[#6b7280] mb-3">Step 02</p>
            <h2 className="font-serif text-3xl font-bold text-[#0a0a0a]">Syrto Research Group</h2>
            <div className="w-10 h-px bg-[#1a4a3a] mt-3 mb-6" />
            <p className="text-[#374151] text-sm leading-relaxed">
              Candidates who complete the Academy join the Syrto Research Group, our junior
              research group developed in partnership with Syrto — a financial intelligence
              startup. Members use Syrto&apos;s proprietary software to conduct advanced
              financial analysis powered by Knowledge Graphs, Neural Networks and Machine
              Learning.
            </p>
          </div>

        </div>
      </section>

      {/* ── Step 03: Lab & Research ── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">

          {/* Left — text */}
          <div>
            <p className="text-xs tracking-widest uppercase text-[#6b7280] mb-3">Step 03</p>
            <h2 className="font-serif text-3xl font-bold text-[#0a0a0a]">Lab &amp; Research</h2>
            <div className="w-10 h-px bg-[#1a4a3a] mt-3 mb-6" />
            <p className="text-[#374151] text-sm leading-relaxed">
              The most promising members progress to our Lab &amp; Research group, the
              operational core of Alata Investment Club. Here, members produce equity research,
              M&amp;A analysis, macroeconomic reports and earnings breakdowns — all published
              on our LinkedIn page and shared with our community.
            </p>
          </div>

          {/* Right — topic cards */}
          <div className="space-y-3">
            {researchTopics.map(item => (
              <div
                key={item.title}
                className="border border-black/10 p-4"
                style={{ borderTop: '2px solid #1a4a3a' }}
              >
                <p className="text-sm font-medium text-[#0a0a0a] mb-0.5">{item.title}</p>
                <p className="text-xs text-[#6b7280]">{item.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Apply Now ── */}
      <section className="bg-[#1a4a3a] py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold text-white mb-3">Ready to join?</h2>
          <p className="text-white/70 text-sm mb-8">
            Applications are reviewed on a rolling basis.
          </p>
          <ApplySection applicationsOpen={applicationsOpen} />
        </div>
      </section>

    </div>
  )
}
