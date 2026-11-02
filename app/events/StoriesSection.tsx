'use client'

import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import LitList from '@/app/components/site/LitList'
import Lightbox from '@/app/components/site/Lightbox'
import { youtubeEmbed } from '@/lib/event-display'

export type Story = {
  id: string
  label: string
  title: string
  meta: string | null
  description: string
  photos: string[]
  film: string | null
}

/** Boards Ev3 / Ev6 / Ev7: one story at a time, chosen from the lit list. */
export default function StoriesSection({ stories }: { stories: Story[] }) {
  const [activeId, setActiveId] = useState(stories[0]?.id ?? '')
  const [playing, setPlaying] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const reduced = useReducedMotion()
  const story = stories.find(s => s.id === activeId) ?? stories[0]
  if (!story) return null

  const embed = story.film ? youtubeEmbed(story.film) : null
  const key = story.photos[0]
  const thumbs = story.photos.slice(1, 4)

  function select(id: string) {
    setActiveId(id)
    setPlaying(false)
  }

  // Titles like "Inside the Markets w/Borsa Italiana": the guest goes in italics.
  const [lead, guest] = story.title.split(/\s+w\/\s*/i)

  return (
    <section id="stories" className="bg-night py-14 text-ivory md:flex md:min-h-svh md:items-center md:py-[max(32px,5svh)]">
      <div className="rd-gutter grid w-full grid-cols-1 gap-8 md:grid-cols-[clamp(170px,17vw,240px)_minmax(0,1fr)] md:gap-[clamp(20px,2.4vw,34px)]">
        <div className="min-w-0">
          <div className="rd-eyebrow mb-6 text-ivory/70 md:mb-[max(14px,3svh)]">Stories</div>
          <LitList
            items={stories.map(s => ({ key: s.id, label: s.label }))}
            activeKey={story.id}
            onSelect={select}
            rowOnMobile
            ariaLabel="Stories"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={story.id}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="min-w-0"
          >
            <div className="relative aspect-[784/372] w-full overflow-hidden bg-moss md:aspect-auto md:h-[clamp(150px,34svh,372px)]">
              {playing && embed ? (
                <iframe
                  src={embed}
                  title={`${story.label}, the film`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : (
                <>
                  {key && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={key} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-night opacity-[0.38]" />
                  {embed && (
                    <button
                      type="button"
                      onClick={() => setPlaying(true)}
                      className="rd-italic absolute bottom-[22px] left-[28px] text-[clamp(26px,2.9vw,34px)] hover:underline underline-offset-[0.18em]"
                    >
                      Relive the day
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="mt-5 grid gap-6 md:mt-[max(14px,2.4svh)] lg:grid-cols-[minmax(0,1fr)_clamp(200px,22vw,300px)] lg:gap-10">
              <div>
                {story.meta && <div className="text-[clamp(11px,1.6svh,13px)] text-ivory/75">{story.meta}</div>}
                <h2 className="rd-display mt-1.5 text-[clamp(26px,min(3vw,4.4svh),36px)]">
                  {lead}{guest && <> <em>w/ {guest}</em></>}
                </h2>
                <div className="mt-2.5 text-[clamp(12px,min(1.05vw,1.85svh),13.5px)] leading-[1.55] text-ivory/[0.88] md:mt-[max(8px,1.4svh)] md:columns-2 md:gap-7">
                  {story.description.split(/\n{2,}/).map((para, i) => (
                    <p key={i} className="mb-[0.7em] whitespace-pre-line break-inside-avoid last:mb-0">{para}</p>
                  ))}
                </div>
              </div>
              {story.photos.length > 0 && (
                <div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(thumbs.length ? thumbs : story.photos.slice(0, 3)).map((src, i) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setLightbox(thumbs.length ? i + 1 : i)}
                        className="aspect-[107/140] overflow-hidden bg-moss"
                        aria-label={`Open photo ${i + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" loading="lazy" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightbox(0)}
                    className="rd-italic mt-3 text-[clamp(20px,3svh,26px)] hover:underline underline-offset-[0.18em] md:mt-[max(8px,1.6svh)]"
                  >
                    View all photos
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {lightbox !== null && (
        <Lightbox photos={story.photos} start={lightbox} title={story.label} onClose={() => setLightbox(null)} />
      )}
    </section>
  )
}
