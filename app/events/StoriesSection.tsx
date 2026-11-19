'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import LitList from '@/app/components/site/LitList'
import Lightbox from '@/app/components/site/Lightbox'
import { isVerticalFilm, youtubeEmbed } from '@/lib/event-display'

export type Story = {
  id: string
  label: string
  title: string
  meta: string | null
  description: string
  photos: string[]
  film: string | null
}

/** Photos shown in the big grid of a vertical story; the lightbox has all of them. */
const GRID_PHOTOS = 6

/** Titles like "Inside the Markets w/Borsa Italiana": the guest goes in italics. */
const splitTitle = (title: string) => title.split(/\s+w\/\s*/i)

/**
 * Boards Ev3 / Ev6 / Ev7: one story at a time, chosen from the lit list.
 * Every story, whatever its film, uses the same vertical layout: the list and the
 * 9:16 frame stay in place from 1024px up while the text and the photos scroll.
 */
export default function StoriesSection({ stories }: { stories: Story[] }) {
  const [activeId, setActiveId] = useState(stories[0]?.id ?? '')
  const [playing, setPlaying] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const story = stories.find(s => s.id === activeId) ?? stories[0]
  if (!story) return null

  const embed = story.film ? youtubeEmbed(story.film) : null

  function select(id: string) {
    setActiveId(id)
    setPlaying(false)
    // Reading a long story, then choosing another: start it from its top.
    const el = sectionRef.current
    if (el && el.getBoundingClientRect().top < 0) {
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
    }
  }

  return (
    <section ref={sectionRef} id="stories" className="min-h-svh bg-night py-14 text-ivory md:flex md:items-center md:py-[max(32px,5svh)]">
      <div className="rd-gutter grid w-full grid-cols-1 gap-8 lg:grid-cols-[clamp(170px,17vw,240px)_minmax(0,1fr)] lg:gap-[clamp(20px,2.4vw,34px)]">
        <div className="min-w-0 lg:sticky lg:top-[max(32px,5svh)] lg:self-start">
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
            <Story story={story} embed={embed} playing={playing} onPlay={() => setPlaying(true)} onOpenPhoto={setLightbox} />
          </motion.div>
        </AnimatePresence>
      </div>

      {lightbox !== null && (
        <Lightbox photos={story.photos} start={lightbox} title={story.label} onClose={() => setLightbox(null)} />
      )}
    </section>
  )
}

type StoryViewProps = {
  story: Story
  embed: string | null
  playing: boolean
  onPlay: () => void
  onOpenPhoto: (index: number) => void
}

// ── The frame stays, the text scrolls ─────────────────────────────────────────

function Story({ story, embed, playing, onPlay, onOpenPhoto }: StoryViewProps) {
  const poster = story.photos[0]
  const [lead, guest] = splitTitle(story.title)
  const hasFrame = !!(poster || embed)
  // A landscape film would show black bars in a 9:16 frame, so while it plays
  // the frame takes the film's own shape; the poster stays 9:16.
  const landscapePlaying = playing && !!embed && !isVerticalFilm(story.film)

  return (
    <div className={`grid gap-8 ${hasFrame ? 'lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-[clamp(28px,3.4vw,52px)]' : ''}`}>
      {/* Below 1024px: full width up to 320px, centred, not sticky. From 1024px: as high as 76svh and sticky. */}
      {hasFrame && (
      <div className="mx-auto w-full max-w-[320px] lg:sticky lg:top-[max(32px,5svh)] lg:mx-0 lg:w-[calc(min(76svh,720px)*9/16)] lg:max-w-none lg:self-start">
        <div className={`relative w-full overflow-hidden bg-moss ${landscapePlaying ? 'aspect-video' : 'aspect-[9/16]'}`}>
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
              {poster && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-night opacity-[0.38]" />
              {embed && (
                <button
                  type="button"
                  onClick={onPlay}
                  className="rd-italic absolute bottom-[22px] left-[24px] text-[clamp(26px,2.9vw,34px)] hover:underline underline-offset-[0.18em]"
                >
                  Relive the day
                </button>
              )}
            </>
          )}
        </div>
      </div>
      )}

      <div className="min-w-0 lg:max-w-[680px]">
        {story.meta && <div className="text-[13px] text-ivory/75">{story.meta}</div>}
        <h2 className="rd-display mt-1.5 text-[clamp(30px,3.2vw,46px)]">
          {lead}{guest && <> <em>w/ {guest}</em></>}
        </h2>
        <div className="mt-5 max-w-[560px] text-[15px] leading-[1.7] text-ivory/[0.88]">
          {story.description.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="mb-[0.8em] whitespace-pre-line last:mb-0">{para}</p>
          ))}
        </div>

        {story.photos.length > 0 && (
          <div className="mt-10">
            <div className="grid grid-cols-2 gap-3">
              {story.photos.slice(0, GRID_PHOTOS).map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => onOpenPhoto(i)}
                  className="aspect-[4/5] overflow-hidden bg-moss"
                  aria-label={`Open photo ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" loading="lazy" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onOpenPhoto(0)}
              className="rd-italic mt-4 text-[26px] hover:underline underline-offset-[0.18em]"
            >
              View all photos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
