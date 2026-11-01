'use client'

import { useState } from 'react'

export type ArchivePost = { id: number; date: string | null; title: string; url: string | null }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`
}

const STEP = 12

/** Board R3: the LinkedIn posts as a typographic list, opened outside the site. */
export default function ReportsArchive({ posts }: { posts: ArchivePost[] }) {
  const [shown, setShown] = useState(STEP)
  if (posts.length === 0) {
    return <p className="rd-italic mt-10 text-[26px] text-earth-700">The archive fills itself as new posts go out.</p>
  }
  return (
    <>
      <ul className="mt-10 border-t border-night md:mt-[54px]">
        {posts.slice(0, shown).map(p => {
          const inner = (
            <>
              <span className="rd-display text-[24px] leading-none md:text-[28px]">{p.date ? day(p.date) : ''}</span>
              <span className="rd-display line-clamp-2 text-[21px] leading-[1.15] md:text-[26px]">{p.title}</span>
              <span className="hidden justify-self-end text-[10px] font-semibold uppercase tracking-[0.14em] text-earth-500 sm:block">LinkedIn</span>
            </>
          )
          const cls = 'grid grid-cols-[70px_minmax(0,1fr)] items-baseline gap-x-4 border-b border-night/20 pb-5 pt-[22px] sm:grid-cols-[90px_minmax(0,1fr)_90px] sm:gap-x-5'
          return (
            <li key={p.id}>
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener noreferrer" className={`${cls} transition-colors hover:bg-night/[0.03]`}>
                  {inner}
                  <span className="sr-only"> (opens LinkedIn in a new tab)</span>
                </a>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
      {shown < posts.length && (
        <button
          type="button"
          onClick={() => setShown(n => n + STEP)}
          className="rd-italic mt-8 text-[26px] hover:underline underline-offset-[0.18em]"
        >
          Show more
        </button>
      )}
    </>
  )
}
