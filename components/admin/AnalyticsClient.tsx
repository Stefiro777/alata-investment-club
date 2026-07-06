'use client'

import { useState, useEffect } from 'react'

type InternalData = {
  total_members: number
  members_by_team: { team: string; count: number }[]
  total_registrations: number
  registrations_by_event: { event_title: string; count: number }[]
  total_applications: number
  applications_this_month: number
  checked_in_total: number
  open_events: number
}

// ── Animated horizontal bar chart ─────────────────────────────────────────────
function BarChart({
  rows,
  labelKey,
  valueKey,
  colorHex = '#1a4a3a',
}: {
  rows: Record<string, string | number>[]
  labelKey: string
  valueKey: string
  colorHex?: string
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 60) }, [])

  if (rows.length === 0) return <p className="text-xs text-ink-500 py-4">No data.</p>

  const max = Math.max(...rows.map(r => Number(r[valueKey])))

  return (
    <div className="space-y-3">
      {rows.map((row, i) => {
        const value = Number(row[valueKey])
        const pct = max > 0 ? (value / max) * 100 : 0
        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#1a1a1a] uppercase tracking-wide truncate pr-4" style={{ maxWidth: '70%' }}>
                {String(row[labelKey])}
              </span>
              <span className="text-xs font-bold text-forest flex-shrink-0">{value}</span>
            </div>
            <div className="h-2 bg-[#e5e5e5] w-full">
              <div
                className="h-2"
                style={{
                  width: mounted ? `${pct}%` : '0%',
                  backgroundColor: colorHex,
                  transition: `width 600ms ease ${i * 60}ms`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AnalyticsClient() {
  const [data, setData] = useState<InternalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/analytics/internal')
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); setLoading(false); return }
        setData(json)
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-12">
      {/* Page heading */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-forest">Analytics</h2>
        <div className="w-8 h-px bg-forest mt-2" />
      </div>

      {/* ── Section 1: Internal KPIs ── */}
      <section>
        <p className="text-xs font-medium tracking-widest uppercase text-ink-500 mb-6">Internal KPIs</p>

        {loading && <p className="text-sm text-ink-500">Loading…</p>}
        {error && <p className="text-xs text-red-600 border-l-2 border-red-400 pl-3 py-1">{error}</p>}

        {data && (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Members',       value: data.total_members },
                { label: 'Total Registrations', value: data.total_registrations },
                { label: 'Total Applications',  value: data.total_applications },
                { label: 'Open Events',          value: data.open_events },
              ].map(kpi => (
                <div key={kpi.label} className="bg-white border border-line px-5 py-4">
                  <p className="text-[10px] font-medium text-ink-500 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-3xl font-bold text-forest mt-1">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Bar charts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="bg-white border border-line p-6">
                <p className="text-[10px] font-medium text-ink-500 uppercase tracking-widest mb-5">Members by Team</p>
                <BarChart
                  rows={data.members_by_team as unknown as Record<string, string | number>[]}
                  labelKey="team"
                  valueKey="count"
                />
              </div>
              <div className="bg-white border border-line p-6">
                <p className="text-[10px] font-medium text-ink-500 uppercase tracking-widest mb-5">Registrations by Event</p>
                <BarChart
                  rows={data.registrations_by_event as unknown as Record<string, string | number>[]}
                  labelKey="event_title"
                  valueKey="count"
                />
              </div>
            </div>

            {/* Small stats */}
            <div className="flex items-center gap-8">
              <p className="text-sm text-ink-500">
                Applications this month:{' '}
                <span className="font-bold text-forest">{data.applications_this_month}</span>
              </p>
              <p className="text-sm text-ink-500">
                Check-ins total:{' '}
                <span className="font-bold text-forest">{data.checked_in_total}</span>
              </p>
            </div>
          </>
        )}
      </section>

      {/* ── Section 2: Google Analytics ── */}
      <section>
        <p className="text-xs font-medium tracking-widest uppercase text-ink-500 mb-6">Google Analytics</p>

        <div className="bg-white border border-line p-8 flex flex-col gap-4">
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-widest uppercase px-6 py-3 transition-colors self-start"
          >
            Open Google Analytics →
          </a>
          <p className="text-xs text-ink-500">
            Property: G-1DKFFPXFT6 · alatainvestmentclub.com
          </p>
        </div>
      </section>
    </div>
  )
}
