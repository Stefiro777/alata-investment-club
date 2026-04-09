import Image from 'next/image'
import type { FeaturedReport } from '@/lib/types'
import Reveal from './Reveal'

export default function FeaturedReports({ reports }: { reports: FeaturedReport[] }) {
  if (reports.length === 0) return null

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal className="mb-16">
          <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-3">In Evidence</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-[#0a0a0a] mb-3">
            Featured Reports
          </h2>
          <div className="w-10 h-px bg-[#1a4a3a]" />
        </Reveal>

        <div className="space-y-0">
          {reports.map((report, i) => {
            const imageLeft = i % 2 === 0
            return (
              <div
                key={report.id}
                className="grid md:grid-cols-2 border border-black/10"
                style={{ borderBottom: i < reports.length - 1 ? 'none' : undefined }}
              >
                {/* Image panel */}
                <Reveal
                  direction={imageLeft ? 'left' : 'right'}
                  className={`relative overflow-hidden bg-[#f5f5f5] ${imageLeft ? 'md:order-1' : 'md:order-2'}`}
                  style={{ aspectRatio: '4/3', minHeight: '300px' }}
                >
                  {report.image_url ? (
                    <Image
                      src={report.image_url}
                      alt={report.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1a4a3a]/5">
                      <svg className="w-12 h-12 text-[#1a4a3a]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </Reveal>

                {/* Text panel */}
                <Reveal
                  direction={imageLeft ? 'right' : 'left'}
                  className={`flex flex-col justify-center px-10 py-12 lg:px-14 lg:py-16 bg-white ${imageLeft ? 'md:order-2' : 'md:order-1'}`}
                >
                  <p className="text-xs tracking-[0.2em] uppercase text-[#9ca3af] mb-4">
                    Featured Report
                  </p>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#0a0a0a] leading-snug mb-4">
                    {report.title}
                  </h3>
                  <div className="w-8 h-px bg-[#1a4a3a] mb-6" />
                  <p className="text-[#6b7280] text-sm leading-relaxed mb-8">
                    {report.description}
                  </p>
                  {report.pdf_url && (
                    <div>
                      <a
                        href={report.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-widest uppercase px-8 py-3.5 transition-colors duration-150"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Report
                      </a>
                    </div>
                  )}
                </Reveal>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
