'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Section } from '@/app/components/member/ui'
import { fieldCls, labelCls, errorCls } from '@/components/admin/crm/ui'
import { ABOUT_STATS_KEY, ABOUT_STATS_COUNT, type AboutStat } from '@/lib/about-stats'
import { SESSION_PRICE_KEY, formatSessionPrice, parseSessionPrice } from '@/lib/session-price'

const saveAction = 'rd-italic text-[24px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50'

/** Board > Overview: what the Career session costs. Free for active members; the server computes the price at booking. */
export function CareerPriceSection({ initialCents }: { initialCents: string }) {
  const [price, setPrice] = useState(() => formatSessionPrice(initialCents))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    setError(null)
    const parsed = parseSessionPrice(price)
    if ('error' in parsed) { setError(parsed.error); return }
    setSaving(true)
    const { error: err } = await createClient()
      .from('settings')
      .upsert({ key: SESSION_PRICE_KEY, value: String(parsed.cents) }, { onConflict: 'key' })
    if (err) setError(err.message)
    else {
      setPrice(formatSessionPrice(String(parsed.cents)))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <Section id="career-service" title="Career session" meta="30 minutes">
      <form onSubmit={save} className="pt-3">
        <p className="text-[12px] leading-[1.6] text-earth-600">
          One price for every session with a mentor. Sessions are free for members with an active membership;
          the price is always computed by the server at booking.
        </p>
        <label className="mt-5 block">
          <span className={labelCls}>Price (€)</span>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={e => setPrice(e.target.value)}
            aria-label="Career session price in euro"
            placeholder="30,00"
            className={`${fieldCls} sm:w-40`}
          />
        </label>
        {error && <p role="alert" className={`${errorCls} mt-4`}>{error}</p>}
        <div className="mt-5 flex items-baseline gap-5">
          <button type="submit" disabled={saving} className={saveAction}>{saving ? 'Saving…' : 'Save'}</button>
          {saved && <span role="status" className="text-[12px] text-earth-600">Saved</span>}
        </div>
      </form>
    </Section>
  )
}

/** Board > Overview: the numbers band of the Home. Empty rows are not shown. */
export function AboutMetricsSection({ initial }: { initial: AboutStat[] }) {
  const [stats, setStats] = useState<AboutStat[]>(
    Array.from({ length: ABOUT_STATS_COUNT }, (_, i) => initial[i] ?? { value: '', label: '' }),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    const cleaned = stats
      .map(s => ({ value: s.value.trim(), label: s.label.trim() }))
      .filter(s => s.value && s.label)
    if (cleaned.length === 0) {
      setError('Enter at least one metric (a value and a label).')
      setSaving(false)
      return
    }
    const { error: err } = await createClient()
      .from('settings')
      .upsert({ key: ABOUT_STATS_KEY, value: JSON.stringify(cleaned) }, { onConflict: 'key' })
    if (err) setError(err.message)
    else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  return (
    <Section id="about-stats" title="About metrics" meta="Home">
      <form onSubmit={save} className="pt-3">
        <p className="text-[12px] leading-[1.6] text-earth-600">
          The numbers band of the Home. A value can carry a suffix, like <span className="font-medium text-night">50+</span> or{' '}
          <span className="font-medium text-night">190K+</span>. Empty rows are not shown.
        </p>
        <div className="mt-4 space-y-3">
          {stats.map((s, i) => (
            <div key={i} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4">
              <input
                value={s.value}
                onChange={e => setStats(prev => prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                placeholder="50+"
                maxLength={16}
                aria-label={`Metric ${i + 1} value`}
                className={fieldCls}
              />
              <input
                value={s.label}
                onChange={e => setStats(prev => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                placeholder="Speaker sessions"
                maxLength={60}
                aria-label={`Metric ${i + 1} label`}
                className={fieldCls}
              />
            </div>
          ))}
        </div>
        {error && <p role="alert" className={`${errorCls} mt-4`}>{error}</p>}
        <div className="mt-5 flex items-baseline gap-5">
          <button type="submit" disabled={saving} className={saveAction}>{saving ? 'Saving…' : 'Save'}</button>
          {saved && <span role="status" className="text-[12px] text-earth-600">Saved</span>}
        </div>
      </form>
    </Section>
  )
}
