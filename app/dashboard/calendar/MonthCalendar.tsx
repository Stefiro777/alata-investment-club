'use client'

import { useMemo, useState } from 'react'

/* Board ACld: one month grid with the day number centred and a big dot per kind
   of date underneath, next to a "Coming up" list. Used by both calendars, Club
   and PED, so they share the same rules (a dot colour per kind, a legend). */

export const CLUB_EVENT = '#1a4a3a'
export const TEAM_DATE = '#b5530f'

export type CalItem = {
  id: string
  date: string // YYYY-MM-DD
  title: string
  meta?: string
  color: string
  muted?: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Six weeks starting on the Monday on or before the 1st; trailing empty weeks are cut. */
function buildGrid(year: number, month: number): Date[] {
  const dow = (new Date(year, month, 1).getDay() + 6) % 7
  const days = Array.from({ length: 42 }, (_, i) => new Date(year, month, 1 - dow + i))
  return days[35].getMonth() === month ? days : days.slice(0, 35)
}

export default function MonthCalendar({
  items, legend, onPick, comingUpTitle = 'Coming up', emptyText = 'Nothing coming up.',
}: {
  items: CalItem[]
  legend: { label: string; color: string }[]
  onPick: (id: string) => void
  comingUpTitle?: string
  emptyText?: string
}) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dayOpen, setDayOpen] = useState<string | null>(null)
  const todayStr = toISODate(now)

  const grid = useMemo(() => buildGrid(year, month), [year, month])
  const byDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    for (const it of items) (map[it.date] ??= []).push(it)
    return map
  }, [items])
  const upcoming = useMemo(() => items.filter(i => i.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8), [items, todayStr])

  const shift = (delta: number) => {
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
  }
  const prev = new Date(year, month - 1, 1)
  const next = new Date(year, month + 1, 1)

  function pickDay(date: string) {
    const list = byDate[date] ?? []
    if (list.length === 1) onPick(list[0].id)
    else if (list.length > 1) setDayOpen(date)
  }

  return (
    <div className="grid gap-x-12 gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="flex items-baseline justify-between gap-4 pb-3">
          <h2 className="rd-italic text-[clamp(28px,3vw,34px)]">{MONTHS[month]} {year}</h2>
          <div className="flex items-baseline gap-3 text-[18px]">
            <button type="button" onClick={() => shift(-1)} className="rd-italic text-earth-500 hover:text-night" aria-label={`${MONTHS[prev.getMonth()]} ${prev.getFullYear()}`}>{MONTHS[prev.getMonth()]}</button>
            <span aria-hidden className="text-earth-500">·</span>
            <button type="button" onClick={() => shift(1)} className="rd-italic text-night hover:underline underline-offset-[0.18em]" aria-label={`${MONTHS[next.getMonth()]} ${next.getFullYear()}`}>{MONTHS[next.getMonth()]}</button>
          </div>
        </div>
        <div className="border-t border-night">
          <div className="grid grid-cols-7 border-b border-night">
            {WEEKDAYS.map(d => <div key={d} className="rd-eyebrow py-2.5 text-center text-[10px] text-earth-500">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {grid.map(day => {
              const date = toISODate(day)
              const inMonth = day.getMonth() === month
              const list = byDate[date] ?? []
              const kinds = inMonth ? Array.from(new Set(list.map(i => i.color))) : []
              const isToday = date === todayStr
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => pickDay(date)}
                  disabled={list.length === 0 || !inMonth}
                  tabIndex={inMonth ? undefined : -1}
                  aria-hidden={inMonth ? undefined : true}
                  aria-label={`${day.getDate()} ${MONTHS[day.getMonth()]}${list.length ? `, ${list.length} ${list.length === 1 ? 'date' : 'dates'}` : ''}`}
                  className={`flex h-[58px] flex-col items-center justify-start gap-1.5 border-b border-night/20 pt-2 transition-colors sm:h-[64px] ${list.length ? 'cursor-pointer hover:bg-night/[0.04]' : 'cursor-default'} ${inMonth ? '' : 'pointer-events-none'}`}
                >
                  <span className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[13px] ${isToday ? 'bg-night text-ivory' : ''}`}>{inMonth ? day.getDate() : ''}</span>
                  <span className="flex h-[10px] items-center justify-center gap-1">
                    {kinds.slice(0, 3).map(c => (
                      <i key={c} className="block h-[10px] w-[10px] rounded-full" style={{ backgroundColor: c, opacity: list.filter(i => i.color === c).every(i => i.muted) ? 0.4 : 1 }} />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {legend.map(l => (
            <li key={l.label} className="flex items-center gap-2 text-[12px] text-earth-700">
              <i className="block h-[10px] w-[10px] rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="rd-italic pb-3 text-[clamp(28px,3vw,34px)]">{comingUpTitle}</h2>
        <div className="border-t border-night">
          {upcoming.length === 0 ? (
            <p className="py-6 text-[13px] text-earth-600">{emptyText}</p>
          ) : (
            <ul>
              {upcoming.map(it => {
                const d = new Date(it.date + 'T00:00:00')
                return (
                  <li key={it.id} className="border-b border-night/20">
                    <button type="button" onClick={() => onPick(it.id)} className="group grid w-full grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-4 py-3.5 text-left">
                      <span className="text-center">
                        <span className="rd-display block text-[26px] leading-none">{String(d.getDate()).padStart(2, '0')}</span>
                        <span className="rd-eyebrow mt-1 block text-[9px] text-earth-500">{SHORT_MONTHS[d.getMonth()]}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="rd-display block truncate text-[22px] leading-[1.15] group-hover:underline underline-offset-[0.18em]">{it.title}</span>
                        {it.meta && <span className="mt-0.5 flex items-center gap-2 text-[12px] text-earth-600"><i className="block h-[8px] w-[8px] shrink-0 rounded-full" style={{ backgroundColor: it.color }} />{it.meta}</span>}
                      </span>
                      <span className="rd-italic text-[20px]">Open</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {dayOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/50 p-4" onClick={e => { if (e.target === e.currentTarget) setDayOpen(null) }}>
          <div className="w-full max-w-sm bg-ivory p-6 text-night shadow-2xl">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="rd-italic text-[26px]">{new Date(dayOpen + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}</h3>
              <button type="button" onClick={() => setDayOpen(null)} className="rd-italic text-[18px] hover:underline underline-offset-[0.18em]">Close</button>
            </div>
            <ul className="mt-3 max-h-72 overflow-y-auto border-t border-night">
              {(byDate[dayOpen] ?? []).map(it => (
                <li key={it.id} className="border-b border-night/20">
                  <button type="button" onClick={() => { setDayOpen(null); onPick(it.id) }} className="flex w-full items-center gap-3 py-3 text-left">
                    <i className="block h-[10px] w-[10px] shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                    <span className="min-w-0">
                      <span className="rd-display block truncate text-[20px] leading-[1.15]">{it.title}</span>
                      {it.meta && <span className="block text-[12px] text-earth-600">{it.meta}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
