'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AdminNavbar from '../components/AdminNavbar'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'quarter-comparison' | 'linkedin' | 'sponsors' | 'finance'

type Member   = { role: string; created_at: string }
type Event    = { id: string; date: string }
type Booking  = { id: string; status: string; is_member_free: boolean; slot_date: string; created_at: string }
type Partner  = { id: string; name: string; type: string; created_at: string }
type Transaction    = { id: string; type: 'revenue' | 'cost' | 'rimborso'; amount: number; category_id: string | null }
type BudgetCategory = { id: string; name: string }
type JobOffer       = { id: string; type: string }

type QuarterSnapshot = {
  id: string
  quarter_number: number
  year: number
  kpi_data: {
    total_members?: number
    new_members?: number
    total_events?: number
    total_registrations?: number
    total_bookings?: number
    confirmed_bookings?: number
    reports_published?: number
  }
  created_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getQuarterStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()
}

function getQuarterStartDate(): string {
  const now = new Date()
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    .toISOString()
    .slice(0, 10)
}

function getCurrentQuarter(): { quarter: number; year: number } {
  const now = new Date()
  return { quarter: Math.floor(now.getMonth() / 3) + 1, year: now.getFullYear() }
}

function prevQuarterOf(q: number, y: number): { quarter: number; year: number } {
  return q === 1 ? { quarter: 4, year: y - 1 } : { quarter: q - 1, year: y }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEuros(n: number): string {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Shared style constants ─────────────────────────────────────────────────────

const labelCls  = 'text-[10px] font-semibold uppercase tracking-widest text-gray-500'
const btnPrimary = 'inline-block bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest px-5 py-2.5 transition-colors'

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-200 px-5 py-5 flex flex-col">
      <p className={`${labelCls} mb-2`}>{label}</p>
      <p className="font-serif text-4xl font-bold text-[#1a4a3a] leading-none">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className={`${labelCls} mb-3 mt-8 first:mt-0`}>{children}</p>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab() {
  const [members, setMembers]           = useState<Member[]>([])
  const [events, setEvents]             = useState<Event[]>([])
  const [totalRegs, setTotalRegs]       = useState(0)
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [reportsQCount, setReportsQCount] = useState(0)
  const [jobs, setJobs]                 = useState<JobOffer[]>([])
  const [snapshots, setSnapshots]       = useState<QuarterSnapshot[]>([])
  const [loading, setLoading]           = useState(true)
  const [barMounted, setBarMounted]     = useState(false)

  // Banner state
  const [showBanner, setShowBanner]     = useState(false)
  const [archiving, setArchiving]       = useState(false)
  const [archiveSuccess, setArchiveSuccess] = useState(false)

  // Past quarters section
  const [pastExpanded, setPastExpanded]   = useState(false)
  const [expandedSnaps, setExpandedSnaps] = useState<Set<string>>(new Set())

  const { quarter: curQ, year: curY } = getCurrentQuarter()
  const { quarter: prevQ, year: prevY } = prevQuarterOf(curQ, curY)

  useEffect(() => {
    const db = createClient()
    const qsDate = getQuarterStartDate()

    Promise.all([
      db.from('club_members').select('role, created_at'),
      db.from('upcoming_events').select('id, date'),
      db.from('event_registrations').select('id', { count: 'exact', head: true }),
      db.from('career_bookings').select('id, status, is_member_free, slot_date, created_at'),
      db.from('contenuti').select('id', { count: 'exact', head: true })
        .eq('tipo', 'report').gte('data_pubblicazione', qsDate),
      db.from('job_offers').select('id, type'),
      db.from('analytics_quarter_snapshots').select('*')
        .order('year', { ascending: false })
        .order('quarter_number', { ascending: false }),
    ]).then(([mRes, eRes, rRes, bRes, rpRes, jRes, snRes]) => {
      const ms  = (mRes.data  ?? []) as Member[]
      const es  = (eRes.data  ?? []) as Event[]
      const bs  = (bRes.data  ?? []) as Booking[]
      const js  = (jRes.data  ?? []) as JobOffer[]
      const sns = (snRes.data ?? []) as QuarterSnapshot[]

      setMembers(ms)
      setEvents(es)
      setTotalRegs(rRes.count ?? 0)
      setBookings(bs)
      setReportsQCount(rpRes.count ?? 0)
      setJobs(js)
      setSnapshots(sns)
      setLoading(false)
      setTimeout(() => setBarMounted(true), 80)

      // Banner: show if previous quarter has no snapshot yet (and at least one snap exists)
      const hasPrevSnap = sns.some(s => s.quarter_number === prevQ && s.year === prevY)
      const hasAnySnap  = sns.length > 0
      const mostRecent  = sns[0]
      const mostRecentIsCurrent = mostRecent?.quarter_number === curQ && mostRecent?.year === curY
      if (hasAnySnap && !mostRecentIsCurrent && !hasPrevSnap) {
        setShowBanner(true)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const qs    = getQuarterStart()
  const today = new Date().toISOString().slice(0, 10)

  const totalMembers          = members.length
  const membersBod            = members.filter(m => m.role === 'bod').length
  const membersDirector       = members.filter(m => m.role === 'director').length
  const membersMember         = members.filter(m => m.role === 'member').length
  const newMembersThisQuarter = members.filter(m => m.created_at >= qs).length

  const totalEvents    = events.length
  const upcomingEvents = events.filter(e => e.date >= today).length
  const avgRegs        = totalEvents > 0 ? Math.round((totalRegs / totalEvents) * 10) / 10 : 0

  const totalBookings       = bookings.length
  const confirmedBookings   = bookings.filter(b => b.status === 'confirmed').length
  const bookingsThisQuarter = bookings.filter(b => b.created_at >= qs).length
  const memberFreeBookings  = bookings.filter(b => b.is_member_free).length

  const totalJobs  = jobs.length
  const activeJobs = jobs.filter(j => j.type === 'official').length
  void totalJobs

  const bodPct    = totalMembers > 0 ? (membersBod      / totalMembers) * 100 : 0
  const dirPct    = totalMembers > 0 ? (membersDirector / totalMembers) * 100 : 0
  const memberPct = totalMembers > 0 ? (membersMember   / totalMembers) * 100 : 0

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const kpiData = {
        total_members:      totalMembers,
        new_members:        newMembersThisQuarter,
        total_events:       totalEvents,
        total_registrations: totalRegs,
        total_bookings:     totalBookings,
        confirmed_bookings: confirmedBookings,
        reports_published:  reportsQCount,
      }
      const res = await fetch('/api/admin/analytics/snapshot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ quarter_number: prevQ, year: prevY, kpi_data: kpiData }),
      })
      if (res.ok) {
        const newSnap: QuarterSnapshot = {
          id:             'local-' + Date.now(),
          quarter_number: prevQ,
          year:           prevY,
          kpi_data:       kpiData,
          created_at:     new Date().toISOString(),
        }
        setSnapshots(prev => [newSnap, ...prev])
        setShowBanner(false)
        setArchiveSuccess(true)
        setTimeout(() => setArchiveSuccess(false), 3000)
      }
    } finally {
      setArchiving(false)
    }
  }

  const toggleSnap = (id: string) => {
    setExpandedSnaps(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div className="space-y-4">

      {/* ── Archive banner ── */}
      {showBanner && (
        <div className="border border-[#1a4a3a] bg-[#f0f5f3] px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-semibold text-[#1a4a3a]">
            A new quarter has started. Archive Q{prevQ} {prevY} data before it updates?
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleArchive}
              disabled={archiving}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] disabled:opacity-60 text-white text-xs font-semibold uppercase tracking-widest px-4 py-2 transition-colors"
            >
              {archiving ? 'Archiving…' : `Archive Q${prevQ} ${prevY}`}
            </button>
            <button
              type="button"
              onClick={() => setShowBanner(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-semibold uppercase tracking-widest px-4 py-2 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {archiveSuccess && (
        <div className="border border-green-300 bg-green-50 px-5 py-3 text-sm font-semibold text-green-800">
          Archived successfully.
        </div>
      )}

      {/* ── Row 1: 3 Hero cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Hero 1 — Total Members */}
        <div className="bg-[#1a4a3a] px-7 py-7 flex flex-col justify-between min-h-[200px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Total Members</p>
          <div>
            <p className="font-serif text-[72px] font-bold text-white leading-none mt-2">{totalMembers}</p>
            <div className="flex h-3 w-full mt-5 overflow-hidden">
              <div className="h-full transition-all duration-700 ease-out"
                style={{ width: barMounted ? `${bodPct}%` : '0%', backgroundColor: '#ccff00' }} />
              <div className="h-full transition-all duration-700 ease-out delay-100"
                style={{ width: barMounted ? `${dirPct}%` : '0%', backgroundColor: '#2d6a56' }} />
              <div className="h-full transition-all duration-700 ease-out delay-200"
                style={{ width: barMounted ? `${memberPct}%` : '0%', backgroundColor: '#e5e7eb' }} />
            </div>
            <div className="flex items-center gap-4 mt-2.5">
              <span className="flex items-center gap-1.5 text-[10px] text-white/60">
                <span className="inline-block w-2 h-2 flex-shrink-0" style={{ backgroundColor: '#ccff00' }} />
                BoD {membersBod}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/60">
                <span className="inline-block w-2 h-2 flex-shrink-0" style={{ backgroundColor: '#2d6a56' }} />
                Directors {membersDirector}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-white/60">
                <span className="inline-block w-2 h-2 flex-shrink-0" style={{ backgroundColor: '#e5e7eb' }} />
                Members {membersMember}
              </span>
            </div>
          </div>
        </div>

        {/* Hero 2 — Events */}
        <div className="bg-[#1a4a3a] px-7 py-7 flex flex-col justify-between min-h-[200px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Total Events</p>
          <div>
            <p className="font-serif text-[72px] font-bold text-white leading-none mt-2">{totalEvents}</p>
            <p className="text-sm text-white/70 mt-4">
              <span className="font-semibold text-white">{upcomingEvents}</span> upcoming
              &nbsp;·&nbsp;
              <span className="font-semibold text-white">{totalRegs}</span> total registrations
            </p>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
              {avgRegs} avg regs / event
            </p>
          </div>
        </div>

        {/* Hero 3 — Career Bookings */}
        <div className="bg-[#1a4a3a] px-7 py-7 flex flex-col justify-between min-h-[200px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Career Bookings</p>
          <div>
            <p className="font-serif text-[72px] font-bold text-white leading-none mt-2">{totalBookings}</p>
            <p className="text-sm text-white/70 mt-4">
              <span className="font-semibold text-white">{confirmedBookings}</span> confirmed
              &nbsp;·&nbsp;
              <span className="font-semibold text-white">{memberFreeBookings}</span> member free
            </p>
            <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">
              {bookingsThisQuarter} this quarter
            </p>
          </div>
        </div>
      </div>

      {/* ── Row 2: 4 medium cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'New Members This Quarter', value: newMembersThisQuarter },
          { label: 'Reports This Quarter',     value: reportsQCount },
          { label: 'Total Registrations',      value: totalRegs },
          { label: 'Active Job Offers',        value: activeJobs },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-[#e5e7eb] px-5 py-5 flex flex-col">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">{label}</p>
            <p className="font-serif text-[48px] font-bold text-[#1a4a3a] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Row 3: Members breakdown + Career mini-stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Left: Members stacked bar panel */}
        <div className="bg-white border border-[#e5e7eb] px-6 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
            Members Breakdown
          </p>
          <div className="flex h-3 w-full overflow-hidden mb-4">
            <div className="h-full transition-all duration-700 ease-out"
              style={{ width: barMounted ? `${bodPct}%` : '0%', backgroundColor: '#1a4a3a' }} />
            <div className="h-full transition-all duration-700 ease-out delay-100"
              style={{ width: barMounted ? `${dirPct}%` : '0%', backgroundColor: '#2d6a56' }} />
            <div className="h-full transition-all duration-700 ease-out delay-200"
              style={{ width: barMounted ? `${memberPct}%` : '0%', backgroundColor: '#e5e7eb' }} />
          </div>
          <div className="space-y-2.5">
            {[
              { color: '#1a4a3a', label: 'Board of Directors', count: membersBod },
              { color: '#2d6a56', label: 'Directors',          count: membersDirector },
              { color: '#e5e7eb', label: 'Members',            count: membersMember, textDark: true },
            ].map(({ color, label, count, textDark }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="inline-block w-3 h-3 flex-shrink-0 border border-gray-200"
                    style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600 uppercase tracking-wide font-medium">{label}</span>
                </div>
                <span className={`font-serif text-xl font-bold ${textDark ? 'text-gray-400' : 'text-[#1a4a3a]'}`}>
                  {count}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-gray-400">Total</span>
            <span className="font-serif text-2xl font-bold text-[#1a4a3a]">{totalMembers}</span>
          </div>
        </div>

        {/* Right: Career Service mini-stats 2×2 */}
        <div className="bg-white border border-[#e5e7eb] px-6 py-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-5">
            Career Service
          </p>
          <div className="grid grid-cols-2 gap-px bg-[#e5e7eb]">
            {[
              { label: 'Total Bookings', value: totalBookings },
              { label: 'Confirmed',      value: confirmedBookings },
              { label: 'This Quarter',   value: bookingsThisQuarter },
              { label: 'Member Free',    value: memberFreeBookings },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white px-5 py-5 flex flex-col">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
                <p className="font-serif text-3xl font-bold text-[#1a4a3a] leading-none">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Past Quarters (collapsible) ── */}
      {snapshots.length > 0 && (
        <div className="border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setPastExpanded(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#fafaf9] transition-colors"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Past Quarters
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${pastExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {pastExpanded && (
            <div className="border-t border-gray-200 divide-y divide-gray-100">
              {snapshots.map(snap => {
                const isExpanded = expandedSnaps.has(snap.id)
                const kd = snap.kpi_data
                const kpiItems = [
                  { label: 'Total Members',       value: kd.total_members      ?? '—' },
                  { label: 'New Members',          value: kd.new_members        ?? '—' },
                  { label: 'Total Events',         value: kd.total_events       ?? '—' },
                  { label: 'Total Registrations',  value: kd.total_registrations ?? '—' },
                  { label: 'Total Bookings',       value: kd.total_bookings     ?? '—' },
                  { label: 'Confirmed Bookings',   value: kd.confirmed_bookings  ?? '—' },
                  { label: 'Reports Published',    value: kd.reports_published   ?? '—' },
                ]
                return (
                  <div key={snap.id}>
                    <button
                      type="button"
                      onClick={() => toggleSnap(snap.id)}
                      className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-[#fafaf9] transition-colors"
                    >
                      <span className="text-sm font-semibold text-gray-700">
                        Q{snap.quarter_number} {snap.year}
                        <span className="ml-3 text-[10px] font-normal text-gray-400 uppercase tracking-widest">
                          archived on {fmtDate(snap.created_at)}
                        </span>
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-5 opacity-80">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {kpiItems.map(item => (
                            <div key={item.label} className="bg-[#fafaf9] border border-gray-100 px-4 py-4 flex flex-col">
                              <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{item.label}</p>
                              <p className="font-serif text-2xl font-bold text-[#1a4a3a] leading-none">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Quarter Comparison Tab ─────────────────────────────────────────────────────

const COMPARISON_METRICS: { label: string; key: keyof QuarterSnapshot['kpi_data'] }[] = [
  { label: 'Total Members',       key: 'total_members' },
  { label: 'New Members',         key: 'new_members' },
  { label: 'Total Events',        key: 'total_events' },
  { label: 'Total Registrations', key: 'total_registrations' },
  { label: 'Total Bookings',      key: 'total_bookings' },
  { label: 'Confirmed Bookings',  key: 'confirmed_bookings' },
  { label: 'Reports Published',   key: 'reports_published' },
]

function QuarterComparisonTab() {
  const [snapshots, setSnapshots] = useState<QuarterSnapshot[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    createClient()
      .from('analytics_quarter_snapshots')
      .select('*')
      .order('year', { ascending: false })
      .order('quarter_number', { ascending: false })
      .then(({ data }) => {
        setSnapshots((data ?? []) as QuarterSnapshot[])
        setLoading(false)
      })
  }, [])

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  if (snapshots.length < 2) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200">
        <p className="text-sm font-semibold text-gray-600 mb-1">Archive at least two quarters to see comparisons.</p>
        <p className="text-xs text-gray-400">Use the Overview tab to archive a quarter when prompted.</p>
      </div>
    )
  }

  // Show last 4 quarters (most recent first)
  const cols = snapshots.slice(0, 4)
  const latest  = cols[0]
  const previous = cols[1]

  return (
    <div>
      <div className="border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[480px]">
          <thead>
            <tr className="bg-[#fafaf9] border-b border-gray-200">
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500 w-48">
                Metric
              </th>
              {cols.map(s => (
                <th key={s.id} className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a]">
                  Q{s.quarter_number} {s.year}
                </th>
              ))}
              <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Δ vs prev
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {COMPARISON_METRICS.map(metric => {
              const values = cols.map(s => s.kpi_data[metric.key] ?? null)
              const defined = values.filter((v): v is number => v !== null)
              const maxVal  = defined.length > 0 ? Math.max(...defined) : null

              const latestVal   = latest.kpi_data[metric.key] ?? null
              const previousVal = previous.kpi_data[metric.key] ?? null
              const delta = latestVal !== null && previousVal !== null
                ? latestVal - previousVal
                : null

              return (
                <tr key={metric.key} className="bg-white hover:bg-[#fafaf9] transition-colors">
                  <td className="px-5 py-3.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    {metric.label}
                  </td>
                  {values.map((val, i) => {
                    const isMax = val !== null && val === maxVal && defined.length > 1
                    return (
                      <td
                        key={i}
                        className="px-5 py-3.5 font-serif text-lg font-bold"
                        style={isMax
                          ? { backgroundColor: '#1a4a3a', color: '#ffffff' }
                          : { color: '#1a4a3a' }
                        }
                      >
                        {val ?? '—'}
                      </td>
                    )
                  })}
                  <td className="px-5 py-3.5 font-semibold text-sm">
                    {delta === null ? (
                      <span className="text-gray-300">—</span>
                    ) : delta > 0 ? (
                      <span className="text-green-600">+{delta}</span>
                    ) : delta < 0 ? (
                      <span className="text-red-600">{delta}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-gray-400 mt-3 uppercase tracking-widest">
        Showing last {cols.length} archived quarter{cols.length > 1 ? 's' : ''}. Δ = latest vs previous.
      </p>
    </div>
  )
}

// ── LinkedIn Posts Tab ─────────────────────────────────────────────────────────

type ContenutoPost = {
  id: number
  titolo: string
  data_pubblicazione: string | null
  link: string | null
}

function getPostTitle(titolo: string): string {
  for (const line of titolo.split(/\r?\n/)) {
    const cleaned = line.replace(/[ \t]+/g, ' ').trim()
    if (cleaned.length > 0) return cleaned
  }
  return titolo
}

function LinkedInPostsTab() {
  const [posts, setPosts]     = useState<ContenutoPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('contenuti')
      .select('id, titolo, data_pubblicazione, link')
      .eq('tipo', 'report')
      .order('data_pubblicazione', { ascending: false })
      .then(({ data }) => {
        setPosts((data ?? []) as ContenutoPost[])
        setLoading(false)
      })
  }, [])

  const qs          = getQuarterStart()
  const thisQuarter = posts.filter(p => p.data_pubblicazione && p.data_pubblicazione >= qs).length

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mb-8">
        <KpiCard label="Total Posts All Time" value={posts.length} />
        <KpiCard label="Posts This Quarter"   value={thisQuarter} />
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 border border-dashed border-gray-200 text-center">
          No posts recorded yet.
        </p>
      ) : (
        <div className="border border-gray-200">
          {posts.map((p, i) => (
            <div key={p.id}
              className={`flex items-start gap-4 px-5 py-4 bg-white hover:bg-[#fafaf9] transition-colors ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">{getPostTitle(p.titolo)}</p>
              </div>
              <div className="flex items-center gap-5 flex-shrink-0 pt-0.5">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {p.data_pubblicazione ? fmtDate(p.data_pubblicazione) : '—'}
                </span>
                {p.link ? (
                  <a href={p.link.startsWith('urn:') ? `https://www.linkedin.com/feed/update/${p.link}/` : p.link}
                    target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] hover:underline underline-offset-2 whitespace-nowrap">
                    Open →
                  </a>
                ) : (
                  <span className="text-[10px] text-gray-300 uppercase tracking-widest">No link</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Sponsors Tab ───────────────────────────────────────────────────────────────

function SponsorsTab() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    createClient()
      .from('partners')
      .select('id, name, type, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPartners((data ?? []) as Partner[])
        setLoading(false)
      })
  }, [])

  const sponsors     = partners.filter(p => p.type === 'sponsor').length
  const partnerCount = partners.filter(p => p.type === 'partner').length

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mb-8">
        <KpiCard label="Total"    value={partners.length} />
        <KpiCard label="Sponsors" value={sponsors} />
        <KpiCard label="Partners" value={partnerCount} />
      </div>

      {partners.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 border border-dashed border-gray-200 text-center">
          No partners or sponsors yet.
        </p>
      ) : (
        <div className="border border-gray-200 mb-4">
          <div className="grid grid-cols-[1fr_100px_90px] gap-4 px-5 py-2.5 bg-[#fafaf9] border-b border-gray-200">
            <span className={labelCls}>Name</span>
            <span className={labelCls}>Type</span>
            <span className={labelCls}>Since</span>
          </div>
          {partners.map((p, i) => (
            <div key={p.id}
              className={`grid grid-cols-[1fr_100px_90px] gap-4 items-center px-5 py-3.5 bg-white ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <span className="text-sm font-semibold text-gray-900">{p.name}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 w-fit ${
                p.type === 'sponsor' ? 'bg-[#1a4a3a] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {p.type}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(p.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 border-l-2 border-gray-200 pl-3 mt-4">
        To track sponsor revenue, add transactions in the Finance tab.
      </p>
    </div>
  )
}

// ── Finance Tab ────────────────────────────────────────────────────────────────

function FinanceTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories]     = useState<BudgetCategory[]>([])
  const [loading, setLoading]           = useState(true)
  const [mounted, setMounted]           = useState(false)

  useEffect(() => {
    const db = createClient()
    Promise.all([
      db.from('transactions').select('id, type, amount, category_id'),
      db.from('budget_categories').select('id, name'),
    ]).then(([txRes, catRes]) => {
      setTransactions((txRes.data ?? []) as Transaction[])
      setCategories((catRes.data ?? []) as BudgetCategory[])
      setLoading(false)
      setTimeout(() => setMounted(true), 60)
    })
  }, [])

  const { income, expenses, balance, byCategory } = useMemo(() => {
    const income   = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter(t => t.type === 'cost').reduce((s, t) => s + t.amount, 0)
    const refunds  = transactions.filter(t => t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
    const balance  = income - expenses + refunds

    const catMap: Record<string, { name: string; amount: number }> = {}
    for (const tx of transactions) {
      const key  = tx.category_id ?? '__none__'
      const name = categories.find(c => c.id === tx.category_id)?.name ?? 'Uncategorised'
      if (!catMap[key]) catMap[key] = { name, amount: 0 }
      if (tx.type === 'revenue' || tx.type === 'rimborso') catMap[key].amount += tx.amount
      if (tx.type === 'cost') catMap[key].amount -= tx.amount
    }
    const byCategory = Object.values(catMap).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

    return { income, expenses, balance, byCategory }
  }, [transactions, categories])

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  if (transactions.length === 0) {
    return (
      <div className="py-16 text-center border border-dashed border-gray-200">
        <p className="text-sm font-semibold text-gray-600 mb-1">No transactions recorded yet.</p>
        <p className="text-xs text-gray-400 mb-6">Add your first transaction in the Finance section.</p>
        <a href="/admin/finance" className={btnPrimary}>Go to Finance →</a>
      </div>
    )
  }

  const maxAbs = Math.max(...byCategory.map(c => Math.abs(c.amount)), 1)

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-8">
        <KpiCard label="Total Income"   value={fmtEuros(income)} />
        <KpiCard label="Total Expenses" value={fmtEuros(expenses)} />
        <KpiCard label="Balance"        value={fmtEuros(balance)}
          sub={balance >= 0 ? 'surplus' : 'deficit'} />
      </div>

      {byCategory.length > 0 && (
        <div className="bg-white border border-gray-200 p-6">
          <p className={`${labelCls} mb-6`}>Breakdown by Category</p>
          <div className="space-y-5">
            {byCategory.map((c, i) => {
              const pct        = maxAbs > 0 ? (Math.abs(c.amount) / maxAbs) * 100 : 0
              const isPositive = c.amount >= 0
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                      {c.name}
                    </span>
                    <span className={`text-xs font-bold ${isPositive ? 'text-[#1a4a3a]' : 'text-red-600'}`}>
                      {isPositive ? '' : '−'}{fmtEuros(Math.abs(c.amount))}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 w-full">
                    <div
                      className="h-1.5"
                      style={{
                        width: mounted ? `${pct}%` : '0%',
                        backgroundColor: isPositive ? '#1a4a3a' : '#dc2626',
                        transition: `width 600ms ease ${i * 60}ms`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',           label: 'Overview' },
  { key: 'quarter-comparison', label: 'Quarter Comparison' },
  { key: 'linkedin',           label: 'LinkedIn Posts' },
  { key: 'sponsors',           label: 'Sponsors' },
  { key: 'finance',            label: 'Finance' },
]

export default function AdminAnalyticsPage() {
  const router                    = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [ready, setReady]         = useState(false)
  const [tab, setTab]             = useState<Tab>('overview')

  useEffect(() => {
    const db = createClient()
    db.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/dashboard'); return }

      if (user.email !== 'finullistefano@gmail.com') {
        const { data: member } = await db
          .from('club_members')
          .select('role')
          .eq('email', user.email!)
          .maybeSingle()
        if (member?.role !== 'bod' && member?.role !== 'director') {
          router.push('/dashboard')
          return
        }
      }

      setUserEmail(user.email ?? '')
      setReady(true)
    })
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <>
      <AdminNavbar userEmail={userEmail} />
      <main className="bg-[#f9f9f9] min-h-screen">
        <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">

          {/* Page header */}
          <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Analytics</h1>
              <div className="w-8 h-px bg-[#1a4a3a]" />
            </div>

            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnPrimary} self-start flex items-center gap-2 mt-1`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Google Analytics
            </a>
          </div>

          {/* Tab bar */}
          <div className="flex gap-0 border-b border-gray-200 mb-8 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  tab === t.key
                    ? 'border-[#1a4a3a] text-[#1a4a3a]'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'overview'           && <OverviewTab />}
          {tab === 'quarter-comparison' && <QuarterComparisonTab />}
          {tab === 'linkedin'           && <LinkedInPostsTab />}
          {tab === 'sponsors'           && <SponsorsTab />}
          {tab === 'finance'            && <FinanceTab />}

        </div>
      </main>
    </>
  )
}
