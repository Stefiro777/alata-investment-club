import { createClient } from '@/lib/supabase-server'
import ApplySection from './ApplySection'
import TimelineSection from './TimelineSection'

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
      <section className="relative py-24 px-6" style={{ background: '#1a4a3a' }}>
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

      <TimelineSection />

      {/* ── Apply Now ── */}
      <section id="application-form" className="bg-[#1a4a3a] py-20 px-6">
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
