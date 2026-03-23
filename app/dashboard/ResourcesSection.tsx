'use client'

import { useState, useEffect, useRef } from 'react'

const resources = [
  {
    category: 'Master',
    items: [
      { label: 'Guida ai Master',            href: 'https://drive.google.com/file/d/1adhwad0yrXPElDBbQs75luisSJ28Rtjn',        isFolder: false },
      { label: 'Master',                     href: 'https://drive.google.com/drive/folders/1fzUtPKRdlPGNtJlH1N-Zxv7Yy10nXJ2T', isFolder: true },
      { label: 'Classifica Business School', href: 'https://drive.google.com/file/d/15hXJv52qF7uYggF9eByAESSTtsSCIuM2',        isFolder: false },
    ],
  },
  {
    category: 'Career & Recruiting',
    items: [
      { label: 'Carriera',            href: 'https://drive.google.com/drive/folders/1Q2fEReeu-Z5GO0SaT6I_Jh3XO6fViCLV', isFolder: true },
      { label: 'Incontri con Alumni', href: 'https://drive.google.com/drive/folders/1eHIsttGYX-BYA8FGS2DfR2_TP4t3UYu_', isFolder: true },
    ],
  },
  {
    category: 'Learning & Education',
    items: [
      { label: 'Training Academy',    href: 'https://drive.google.com/drive/folders/1RXNBKwsZagoJKwVLBU3Y8KE5GbloBDN6', isFolder: true },
      { label: 'Metodo di Studio',    href: 'https://drive.google.com/drive/folders/15Q3AcaRDBul_g8CLrd1ZiEWEWjdj1L22', isFolder: true },
      { label: 'Libri',               href: 'https://drive.google.com/drive/folders/1ylAWGa0LkjR0IOyZoYQ6WQh_EP2n7D70', isFolder: true },
      { label: 'Corsi',               href: 'https://drive.google.com/drive/folders/1wrTXpgn5juSFq6XQX-ctomcpCqxXUMWy', isFolder: true },
      { label: 'GMAT Tips',           href: 'https://drive.google.com/drive/folders/1ngnE37a9pygknoe_3fEKACK6zbvrKe0I', isFolder: true },
      { label: 'Polo - Andrea Zanon', href: 'https://drive.google.com/drive/folders/1fRn3rLtVD0pnN7lwLyEX3_X3bPsQIx9y', isFolder: true },
    ],
  },
  {
    category: 'Documenti Alata',
    items: [
      { label: 'Risorse varie',      href: 'https://docs.google.com/document/d/1XH3iItYGAEtoXSkMS5-V3ikqHw0yDpv-',     isFolder: false },
      { label: 'Presentazione ABIC', href: 'https://docs.google.com/presentation/d/1bpDOBXn0Epb-0bQ8XyrKkrqNncY6dx_5', isFolder: false },
    ],
  },
  {
    category: 'Forbes Next Leaders',
    items: [
      { label: 'Forbes Next Leaders', href: 'https://drive.google.com/drive/folders/1CrWWey10cfgPbnBk4AQsXjbZMUtTYcUx', isFolder: true },
    ],
  },
]

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  )
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

export default function ResourcesSection() {
  const [active, setActive]       = useState(0)
  const [displayed, setDisplayed] = useState(0)
  const [visible, setVisible]     = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function goTo(i: number) {
    if (i === active) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    timerRef.current = setTimeout(() => {
      setDisplayed(i)
      setActive(i)
      setVisible(true)
    }, 200)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  function prev() { goTo((active - 1 + resources.length) % resources.length) }
  function next() { goTo((active + 1) % resources.length) }

  const { category, items } = resources[displayed]

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs tracking-[0.2em] uppercase text-[#6b7280] mb-3">Exclusive Access</p>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0a0a0a]">Resources</h2>
        <div className="w-10 h-px bg-[#1a4a3a] mt-4" />
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2 mb-10">
        {resources.map(({ category: cat }, i) => (
          <button
            key={cat}
            onClick={() => goTo(i)}
            className={`px-4 py-1.5 text-xs font-medium tracking-wide border transition-colors duration-150 ${
              i === active
                ? 'bg-[#1a4a3a] text-white border-[#1a4a3a]'
                : 'border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section nav — arrows + title */}
      <div className="flex items-center gap-6 mb-8">
        <button
          onClick={prev}
          className="w-10 h-10 flex items-center justify-center bg-[#1a4a3a] text-white hover:bg-[#123a2d] transition-colors duration-150 flex-shrink-0"
          aria-label="Sezione precedente"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div>
          <h3 className="font-serif text-2xl font-bold text-[#0a0a0a]">{category}</h3>
          <div className="w-10 h-[2px] bg-[#1a4a3a] mt-2" />
        </div>

        <button
          onClick={next}
          className="w-10 h-10 flex items-center justify-center bg-[#1a4a3a] text-white hover:bg-[#123a2d] transition-colors duration-150 flex-shrink-0"
          aria-label="Sezione successiva"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Cards grid with fade */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {items.map(({ label, href, isFolder }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group p-8 border border-black/10 hover:border-[#1a4a3a] bg-white flex flex-col gap-4 transition-colors duration-150"
          >
            <div className="w-10 h-10 bg-[#f5f5f5] flex items-center justify-center group-hover:bg-[#1a4a3a] transition-colors duration-150">
              {isFolder
                ? <FolderIcon className="w-5 h-5 text-[#1a4a3a] group-hover:text-white transition-colors duration-150" />
                : <FileIcon   className="w-5 h-5 text-[#1a4a3a] group-hover:text-white transition-colors duration-150" />
              }
            </div>
            <p className="font-serif text-xl font-semibold text-[#0a0a0a] group-hover:text-[#1a4a3a] leading-snug transition-colors duration-150">
              {label}
            </p>
            <svg className="w-4 h-4 text-[#6b7280] group-hover:text-[#1a4a3a] mt-auto transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  )
}
