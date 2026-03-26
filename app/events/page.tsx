import { createClient } from '@/lib/supabase-server'
import Image from 'next/image'
import EventsGrid from './EventsGrid'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const supabase = await createClient()

  const { data: eventi } = await supabase
    .from('contenuti')
    .select('*')
    .in('tipo', ['evento', 'aggiornamento'])
    .order('data_pubblicazione', { ascending: false })

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[500px] lg:min-h-[650px] text-white flex items-center overflow-hidden">
        <Image src="/duomo.jpg" alt="" fill className="object-cover grayscale" style={{ objectPosition: 'center 50%' }} priority />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,74,58,0.82)' }} />
        <div className="relative z-10 w-full py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <p className="text-xs tracking-[0.2em] uppercase text-white/50 mb-4">News &amp; Events</p>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Events &amp; Updates
            </h1>
            <div className="w-12 h-px bg-white/30 mb-6" />
            <p className="text-white/70 text-base max-w-2xl leading-relaxed">
              Stay up to date with the latest news, events and research from Alata Investment Club.
            </p>
          </div>
        </div>
      </section>

      {/* Grid with search */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {!eventi || eventi.length === 0 ? (
            <div className="py-20 text-center text-[#6b7280]">
              <p className="text-sm tracking-wide">No events or updates available at the moment.</p>
            </div>
          ) : (
            <EventsGrid items={eventi} />
          )}
        </div>
      </section>
    </div>
  )
}
