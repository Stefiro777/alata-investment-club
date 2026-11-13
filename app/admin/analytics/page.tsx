'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AdminNavbar from '../components/AdminNavbar'
import { EditParticipantModal, deleteParticipant, type Contact } from '@/components/admin/EditParticipantModal'
import { Tabs, Section, Row, FieldRow, SegmentedPills } from '@/app/components/member/ui'
import { isAnalyst } from '@/lib/roles'
import {
  Numbers, Split, CrmTable, CrmRow, NameCell, Sheet, SheetEmpty, Heading, SearchField, SelectField,
  cell, revealSheet, labelCls, btnPrimary, btnGhost, type Column,
} from '@/components/admin/crm/ui'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'quarter-comparison' | 'linkedin' | 'sponsors' | 'finance' | 'participation'

type Member   = { role: string; teams: string[] | null; created_at: string }
type Event    = { id: string; date: string }
type Booking  = { id: string; status: string; is_member_free: boolean; slot_date: string; created_at: string }
type Partner  = { id: string; name: string; type: string; created_at: string }
type JobOffer       = { id: string; type: string }
type MerchItem      = {
  product_name: string; variant_color: string | null; size: string | null
  quantity: number; unit_price_cents: number | null
}
type MerchOrder     = {
  id: string; product_name: string; variant_color: string | null; size: string | null
  quantity: number; price_cents: number | null; customer_name: string | null
  customer_email: string | null; status: string; created_at: string
  /** Every article of the order, from merch_order_items. */
  items: MerchItem[]
}

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

const eurRound = (n: number) => `€${Math.round(n).toLocaleString('it-IT')}`
const Loading = () => <p className="py-10 text-[13px] text-earth-600">Loading…</p>
const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="border-b border-night/20 py-8 text-[13px] text-earth-600">{children}</p>
)

/** A labelled bar on the board palette: label, value, thin rule filled in green. */
function BarRow({ label, value, share, negative }: { label: string; value: React.ReactNode; share: number; negative?: boolean }) {
  return (
    <div className="pb-3 pt-3.5">
      <div className="flex items-baseline justify-between gap-4 text-[13px]">
        <span className="min-w-0 truncate">{label}</span>
        <span className={`rd-num shrink-0 ${negative ? 'text-[#8a2a1d]' : ''}`}>{value}</span>
      </div>
      <div className="mt-2 h-px bg-night/15">
        <i className={`block h-[3px] -translate-y-px ${negative ? 'bg-[#8a2a1d]' : 'bg-club'}`} style={{ width: `${Math.round(Math.min(1, Math.max(0, share)) * 100)}%` }} />
      </div>
    </div>
  )
}

// ── Overview Tab (board ABa1d) ─────────────────────────────────────────────────

/* The public pages and the sources Google Analytics reports on. The numbers live
   in Google Analytics (no reporting API is connected to the site), so each row
   opens the page and the panel says where to read the views. */
const TOP_PAGES = [
  { title: 'Home', href: '/' },
  { title: 'Events', href: '/events' },
  { title: 'Reports', href: '/reports' },
  { title: 'Join Us', href: '/join-us' },
  { title: 'Merch', href: '/merch' },
]
const SOURCES = ['Direct', 'LinkedIn', 'Instagram', 'Search']
const GA_URL = 'https://analytics.google.com'

function OverviewTab() {
  const [members, setMembers]           = useState<Member[]>([])
  const [events, setEvents]             = useState<Event[]>([])
  const [totalRegs, setTotalRegs]       = useState(0)
  const [totalRegsThisQ, setTotalRegsThisQ] = useState(0)
  const [bookings, setBookings]         = useState<Booking[]>([])
  const [reportsQCount, setReportsQCount] = useState(0)
  const [jobs, setJobs]                 = useState<JobOffer[]>([])
  const [loading, setLoading]           = useState(true)

  // Banner state
  const [showBanner, setShowBanner]     = useState(false)
  const [archiving, setArchiving]       = useState(false)
  const [archiveSuccess, setArchiveSuccess] = useState(false)

  const { quarter: curQ, year: curY } = getCurrentQuarter()
  const { quarter: prevQ, year: prevY } = prevQuarterOf(curQ, curY)

  useEffect(() => {
    const db = createClient()
    const qsDate = getQuarterStartDate()

    Promise.all([
      db.from('club_members').select('role, teams, created_at'),
      db.from('upcoming_events').select('id, date'),
      db.from('event_registrations').select('id', { count: 'exact', head: true }),
      db.from('event_registrations').select('id', { count: 'exact', head: true }).gte('created_at', qsDate),
      db.from('career_bookings').select('id, status, is_member_free, slot_date, created_at'),
      db.from('contenuti').select('id', { count: 'exact', head: true })
        .eq('tipo', 'report').gte('data_pubblicazione', qsDate),
      db.from('job_offers').select('id, type'),
      db.from('analytics_quarter_snapshots').select('*')
        .order('year', { ascending: false })
        .order('quarter_number', { ascending: false }),
    ]).then(([mRes, eRes, rAllRes, rQRes, bRes, rpRes, jRes, snRes]) => {
      const ms  = (mRes.data  ?? []) as Member[]
      const es  = (eRes.data  ?? []) as Event[]
      const bs  = (bRes.data  ?? []) as Booking[]
      const js  = (jRes.data  ?? []) as JobOffer[]
      const sns = (snRes.data ?? []) as QuarterSnapshot[]

      setMembers(ms)
      setEvents(es)
      setTotalRegs(rAllRes.count ?? 0)
      setTotalRegsThisQ(rQRes.count ?? 0)
      setBookings(bs)
      setReportsQCount(rpRes.count ?? 0)
      setJobs(js)
      setLoading(false)

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
  // Analysts work in Lab, Media or Events; everyone else is a plain member.
  const membersAnalyst        = members.filter(m => m.role !== 'bod' && m.role !== 'director' && isAnalyst(m.role, m.teams)).length
  const membersMember         = totalMembers - membersBod - membersDirector - membersAnalyst
  const newMembersThisQuarter = members.filter(m => m.created_at >= qs).length

  const totalEvents    = events.length
  const upcomingEvents = events.filter(e => e.date >= today).length
  const avgRegs        = totalEvents > 0 ? Math.round((totalRegs / totalEvents) * 10) / 10 : 0

  const totalBookings       = bookings.length
  const confirmedBookings   = bookings.filter(b => b.status === 'confirmed').length
  const bookingsThisQuarter = bookings.filter(b => b.created_at >= qs).length
  const memberFreeBookings  = bookings.filter(b => b.is_member_free).length

  const activeJobs = jobs.filter(j => j.type === 'official').length

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
        setShowBanner(false)
        setArchiveSuccess(true)
        setTimeout(() => setArchiveSuccess(false), 3000)
      }
    } finally {
      setArchiving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      {showBanner && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-night py-4">
          <p className="rd-italic text-[22px]">A new quarter has started. Archive Q{prevQ} {prevY} before the numbers move on?</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleArchive} disabled={archiving} className={btnPrimary}>
              {archiving ? 'Archiving…' : `Archive Q${prevQ} ${prevY}`}
            </button>
            <button type="button" onClick={() => setShowBanner(false)} className={btnGhost}>Dismiss</button>
          </div>
        </div>
      )}
      {archiveSuccess && <p className="mb-8 border-y border-night/20 py-3 text-[13px]">Archived. It is now in Quarters.</p>}

      <Numbers items={[
        { value: totalMembers, label: 'Members' },
        { value: totalEvents, label: 'Events' },
        { value: totalRegs, label: 'Registrations' },
        { value: totalBookings, label: 'Career bookings' },
      ]} />

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title="Top pages" meta="Google Analytics">
          {TOP_PAGES.map(p => (
            <Row key={p.href} title={p.title} detail={`${p.href} · views in Google Analytics`} href={p.href} external action="Open" />
          ))}
        </Section>
        <Section title="Where visitors come from" meta="Google Analytics">
          {SOURCES.map(s => <Row key={s} title={s} detail="Share of visits in Google Analytics" />)}
          <div className="mt-5">
            <a href={GA_URL} target="_blank" rel="noopener noreferrer" className={btnGhost}>Open Google Analytics</a>
          </div>
        </Section>
      </div>

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title="This quarter" meta={`Q${curQ} ${curY}`}>
          <FieldRow label="New members" value={newMembersThisQuarter} />
          <FieldRow label="Registered" value={totalRegsThisQ} />
          <FieldRow label="Reports" value={reportsQCount} aside="Published" />
          <FieldRow label="Bookings" value={bookingsThisQuarter} aside="Career service" />
          <FieldRow label="Job offers" value={activeJobs} aside="Active" />
        </Section>
        <Section title="Members" meta={`${totalMembers} total`}>
          <BarRow label="Board of Directors" value={membersBod} share={totalMembers ? membersBod / totalMembers : 0} />
          <BarRow label="Management" value={membersDirector} share={totalMembers ? membersDirector / totalMembers : 0} />
          <BarRow label="Analysts" value={membersAnalyst} share={totalMembers ? membersAnalyst / totalMembers : 0} />
          <BarRow label="Members" value={membersMember} share={totalMembers ? membersMember / totalMembers : 0} />
        </Section>
      </div>

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title="Events">
          <FieldRow label="Upcoming" value={upcomingEvents} />
          <FieldRow label="Registered" value={totalRegs} aside={`${avgRegs} per event`} />
        </Section>
        <Section title="Career service">
          <FieldRow label="Bookings" value={totalBookings} />
          <FieldRow label="Confirmed" value={confirmedBookings} />
          <FieldRow label="Member free" value={memberFreeBookings} />
        </Section>
      </div>
    </div>
  )
}

// ── Quarters Tab (board ABa2d) ─────────────────────────────────────────────────

const COMPARISON_METRICS: { label: string; key: keyof QuarterSnapshot['kpi_data'] }[] = [
  { label: 'Total Members',       key: 'total_members' },
  { label: 'New Members',         key: 'new_members' },
  { label: 'Total Events',        key: 'total_events' },
  { label: 'Total Registrations', key: 'total_registrations' },
  { label: 'Total Bookings',      key: 'total_bookings' },
  { label: 'Confirmed Bookings',  key: 'confirmed_bookings' },
  { label: 'Reports Published',   key: 'reports_published' },
]

function downloadSnapshot(s: QuarterSnapshot) {
  const rows = [['Metric', `Q${s.quarter_number} ${s.year}`], ...COMPARISON_METRICS.map(m => [m.label, String(s.kpi_data[m.key] ?? '')])]
  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `alata-Q${s.quarter_number}-${s.year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function QuarterComparisonTab() {
  const [snapshots, setSnapshots] = useState<QuarterSnapshot[]>([])
  const [loading, setLoading]     = useState(true)
  const [openId, setOpenId]       = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    createClient()
      .from('analytics_quarter_snapshots')
      .select('*')
      .order('year', { ascending: false })
      .order('quarter_number', { ascending: false })
      .then(({ data }) => {
        const sns = (data ?? []) as QuarterSnapshot[]
        setSnapshots(sns)
        setOpenId(sns[0]?.id ?? null)
        setLoading(false)
      })
  }, [])

  if (loading) return <Loading />

  const current = snapshots.find(s => s.id === openId) ?? null
  // Show last 4 quarters (most recent first)
  const cols = snapshots.slice(0, 4)
  const latest  = cols[0]
  const previous = cols[1]

  return (
    <div>
      <Split
        sheetRef={sheetRef}
        list={
          <section>
            <Heading title="Quarterly snapshots" meta="Archive" />
            <div className="border-t border-night">
              {snapshots.length === 0
                ? <Empty>No quarter archived yet. Overview offers to archive the last quarter when a new one starts.</Empty>
                : snapshots.map(s => (
                  <div key={s.id} className={s.id === openId ? 'bg-night/[0.05]' : ''}>
                    <Row
                      title={`Q${s.quarter_number} ${s.year}`}
                      detail={`Archived ${fmtDate(s.created_at)}`}
                      action="Open"
                      onClick={() => { setOpenId(s.id); revealSheet(sheetRef.current) }}
                    />
                  </div>
                ))}
            </div>
          </section>
        }
        sheet={
          current ? (
            <Sheet
              title={`Q${current.quarter_number} ${current.year}`}
              meta="Snapshot"
              actions={<button type="button" onClick={() => downloadSnapshot(current)} className={btnPrimary}>Download</button>}
            >
              {COMPARISON_METRICS.map(m => <FieldRow key={m.key} label={m.label.replace(/^Total /, '')} value={current.kpi_data[m.key] ?? '—'} />)}
            </Sheet>
          ) : (
            <SheetEmpty title="Snapshot" text="Choose a quarter from the archive." />
          )
        }
      />

      {cols.length >= 2 && (
        <Section title="Comparison" meta={`Last ${cols.length} quarters · Δ latest vs previous`}>
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              <div className="grid items-end gap-x-4 border-b border-night/20 py-2.5" style={{ gridTemplateColumns: `minmax(0,1.6fr) repeat(${cols.length}, minmax(0,1fr)) 64px` }}>
                <span className="rd-eyebrow text-[9px] text-earth-500">Metric</span>
                {cols.map(s => <span key={s.id} className="rd-eyebrow text-right text-[9px] text-earth-500">Q{s.quarter_number} {s.year}</span>)}
                <span className="rd-eyebrow text-right text-[9px] text-earth-500">Δ</span>
              </div>
              {COMPARISON_METRICS.map(metric => {
                const values = cols.map(s => s.kpi_data[metric.key] ?? null)
                const defined = values.filter((v): v is number => v !== null)
                const maxVal  = defined.length > 0 ? Math.max(...defined) : null
                const latestVal   = latest.kpi_data[metric.key] ?? null
                const previousVal = previous.kpi_data[metric.key] ?? null
                const delta = latestVal !== null && previousVal !== null ? latestVal - previousVal : null
                return (
                  <div key={metric.key} className="grid items-center gap-x-4 border-b border-night/20 py-3" style={{ gridTemplateColumns: `minmax(0,1.6fr) repeat(${cols.length}, minmax(0,1fr)) 64px` }}>
                    <span className="truncate text-[13px]">{metric.label}</span>
                    {values.map((val, i) => {
                      const isMax = val !== null && val === maxVal && defined.length > 1
                      return <span key={i} className={`rd-num text-right font-serif text-[20px] ${isMax ? 'text-club underline decoration-1 underline-offset-4' : ''}`}>{val ?? '—'}</span>
                    })}
                    <span className={`rd-num text-right text-[13px] ${delta !== null && delta < 0 ? 'text-[#8a2a1d]' : delta ? 'text-club' : 'text-earth-500'}`}>
                      {delta === null ? '—' : delta > 0 ? `+${delta}` : delta}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Section>
      )}
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

  if (loading) return <Loading />

  return (
    <div>
      <Numbers items={[
        { value: posts.length, label: 'Posts, all time' },
        { value: thisQuarter, label: 'Posts, this quarter' },
      ]} />

      <Section title="Posts" meta={posts.length}>
        {posts.length === 0 ? <Empty>No posts recorded yet.</Empty> : posts.map(p => (
          <Row
            key={p.id}
            title={<span className="block truncate">{getPostTitle(p.titolo)}</span>}
            detail={p.data_pubblicazione ? fmtDate(p.data_pubblicazione) : '—'}
            href={p.link ? (p.link.startsWith('urn:') ? `https://www.linkedin.com/feed/update/${p.link}/` : p.link) : undefined}
            external
            action={p.link ? 'Open' : <span className="text-earth-500">No link</span>}
          />
        ))}
      </Section>
    </div>
  )
}

// ── Sponsors Tab ───────────────────────────────────────────────────────────────

type SponsorTransaction = {
  id: string
  type: 'revenue' | 'cost' | 'rimborso'
  amount: number
  date: string | null
  description: string | null
}

function SponsorsTab() {
  const [partners, setPartners]           = useState<Partner[]>([])
  const [sponsorTxs, setSponsorTxs]       = useState<SponsorTransaction[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    const db = createClient()
    Promise.all([
      db.from('partners').select('id, name, type, created_at').order('created_at', { ascending: false }),
      // Financial data goes through the privileged server route, not client-side reads.
      fetch('/api/admin/analytics/internal?section=sponsors').then(r => r.ok ? r.json() : { transactions: [] }),
    ]).then(([pRes, txRes]) => {
      setPartners((pRes.data ?? []) as Partner[])
      setSponsorTxs((txRes.transactions ?? []) as SponsorTransaction[])
      setLoading(false)
    })
  }, [])

  const sponsors     = partners.filter(p => p.type === 'sponsor').length
  const partnerCount = partners.filter(p => p.type === 'partner').length

  const sponsorRevenue = sponsorTxs
    .filter(t => t.type === 'revenue')
    .reduce((s, t) => s + t.amount, 0)
  const sponsorCosts = sponsorTxs
    .filter(t => t.type === 'cost')
    .reduce((s, t) => s + t.amount, 0)

  if (loading) return <Loading />

  return (
    <div>
      <Numbers items={[
        { value: sponsors, label: 'Sponsors' },
        { value: partnerCount, label: 'Partners' },
        { value: eurRound(sponsorRevenue), label: 'Sponsor revenue' },
        { value: eurRound(sponsorCosts), label: 'Sponsor costs' },
      ]} />

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title="Sponsorship transactions" meta={sponsorTxs.length}>
          {sponsorTxs.length === 0 ? <Empty>No sponsorship transactions recorded yet.</Empty> : sponsorTxs.map(t => (
            <Row
              key={t.id}
              title={<span className="block truncate">{t.description ?? '—'}</span>}
              detail={`${t.date ? fmtDate(t.date) : '—'} · ${t.type === 'revenue' ? 'Revenue' : 'Cost'}`}
              action={<span className={`rd-num not-italic font-sans text-[13px] ${t.type === 'cost' ? 'text-[#8a2a1d]' : ''}`}>{t.type === 'cost' ? '−' : ''}{fmtEuros(t.amount)}</span>}
            />
          ))}
        </Section>
        <Section title="Partners and sponsors" meta={partners.length}>
          {partners.length === 0 ? <Empty>No partners or sponsors yet.</Empty> : partners.map(p => (
            <Row
              key={p.id}
              title={p.name}
              detail={`${p.type === 'sponsor' ? 'Sponsor' : 'Partner'} · since ${new Date(p.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
            />
          ))}
        </Section>
      </div>
    </div>
  )
}

// ── Finance Tab ────────────────────────────────────────────────────────────────

type FinanceData = {
  income: number
  expenses: number
  balance: number
  byCategory: { name: string; amount: number }[]
  hasTransactions: boolean
  merchOrders: MerchOrder[]
}

const itemLabel = (it: MerchItem) => [it.product_name, it.variant_color, it.size].filter(Boolean).join(' · ')

function FinanceTab() {
  const [finance, setFinance]  = useState<FinanceData | null>(null)
  const [loading, setLoading]  = useState(true)

  useEffect(() => {
    // Financial data goes through the privileged server route, not client-side reads.
    fetch('/api/admin/analytics/internal?section=finance')
      .then(r => r.ok ? r.json() : null)
      .then((data: FinanceData | null) => {
        setFinance(data)
        setLoading(false)
      })
  }, [])

  const merchOrders = useMemo(() => finance?.merchOrders ?? [], [finance])
  const { income = 0, expenses = 0, balance = 0, byCategory = [] } = finance ?? {}

  // ── Merch KPIs: quantities from every article of every order ────────────────
  const { merchRevenue, merchCount, merchItems, merchAvg, topProducts, recentOrders } = useMemo(() => {
    const paid = merchOrders // already filtered by status='paid' in the query
    const merchRevenue = paid.reduce((s, o) => s + (o.price_cents ?? 0), 0) / 100
    const merchCount   = paid.length
    const merchAvg     = merchCount > 0 ? merchRevenue / merchCount : 0
    let merchItems = 0

    // Group by product_name over the articles. Revenue per product is the
    // article price × quantity; an order without item prices counts its total.
    const prodMap: Record<string, { name: string; orders: number; units: number; revenue: number }> = {}
    for (const o of paid) {
      const items = o.items?.length ? o.items : [{ product_name: o.product_name, variant_color: o.variant_color, size: o.size, quantity: o.quantity ?? 1, unit_price_cents: null }]
      const seen = new Set<string>()
      for (const it of items) {
        const key = it.product_name
        if (!prodMap[key]) prodMap[key] = { name: key, orders: 0, units: 0, revenue: 0 }
        if (!seen.has(key)) { prodMap[key].orders += 1; seen.add(key) }
        prodMap[key].units += it.quantity
        prodMap[key].revenue += it.unit_price_cents != null ? (it.unit_price_cents * it.quantity) / 100 : (o.price_cents ?? 0) / 100
        merchItems += it.quantity
      }
    }
    const topProducts = Object.values(prodMap)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10)

    const recentOrders = paid.slice(0, 10)

    return { merchRevenue, merchCount, merchItems, merchAvg, topProducts, recentOrders }
  }, [merchOrders])

  if (loading) return <Loading />

  const maxAbs = Math.max(...byCategory.map(c => Math.abs(c.amount)), 1)
  const maxUnits = Math.max(...topProducts.map(p => p.units), 1)

  return (
    <div>
      {!finance?.hasTransactions ? (
        <div className="border-y border-night py-8">
          <p className="rd-italic text-[24px]">No transactions recorded yet.</p>
          <p className="mt-2 text-[13px] text-earth-600">Add the first one in Finance.</p>
          <a href="/admin/finance" className={`${btnPrimary} mt-5`}>Go to Finance</a>
        </div>
      ) : (
        <>
          <Numbers items={[
            { value: eurRound(income), label: 'Income' },
            { value: eurRound(expenses), label: 'Expenses' },
            { value: eurRound(balance), label: balance >= 0 ? 'Balance, surplus' : 'Balance, deficit' },
          ]} />
          {byCategory.length > 0 && (
            <Section title="By category" meta="Net, all time">
              {byCategory.map((c, i) => (
                <BarRow
                  key={i}
                  label={c.name}
                  value={`${c.amount >= 0 ? '' : '−'}${fmtEuros(Math.abs(c.amount))}`}
                  share={Math.abs(c.amount) / maxAbs}
                  negative={c.amount < 0}
                />
              ))}
            </Section>
          )}
        </>
      )}

      <div className="mt-14">
        <Heading title="Merch" meta="Paid orders" />
        <Numbers items={[
          { value: eurRound(merchRevenue), label: 'Merch revenue' },
          { value: merchCount, label: 'Orders' },
          { value: merchItems, label: 'Items sold' },
          { value: fmtEuros(merchAvg), label: 'Average order' },
        ]} />
      </div>

      {merchOrders.length === 0 ? (
        <div className="mt-8"><Empty>No merch orders yet.</Empty></div>
      ) : (
        <div className="grid gap-x-12 lg:grid-cols-2">
          <Section title="Best selling" meta="By items">
            {topProducts.map(p => (
              <BarRow
                key={p.name}
                label={p.name}
                value={`${p.units} item${p.units !== 1 ? 's' : ''} · ${fmtEuros(p.revenue)}${merchRevenue > 0 ? ` · ${((p.revenue / merchRevenue) * 100).toFixed(1)}%` : ''}`}
                share={p.units / maxUnits}
              />
            ))}
          </Section>
          <Section title="Recent orders" meta={`Last ${recentOrders.length}`}>
            {recentOrders.map(o => {
              const items = o.items?.length ? o.items : []
              const qty = items.reduce((s, it) => s + it.quantity, 0)
              return (
                <Row
                  key={o.id}
                  title={<span className="block truncate">{o.customer_name ?? o.customer_email ?? '—'}</span>}
                  detail={`${fmtDate(o.created_at)} · ${items.map(it => `${it.quantity}× ${itemLabel(it)}`).join(', ') || o.product_name}`}
                  action={<span className="rd-num font-sans text-[13px] not-italic">{o.price_cents != null ? fmtEuros(o.price_cents / 100) : '—'}{qty > 1 ? <span className="block text-right text-[11px] text-earth-500">{qty} items</span> : null}</span>}
                />
              )
            })}
          </Section>
        </div>
      )}
    </div>
  )
}

// ── Participation Tab ────────────────────────────────────────────────────────

// Each entry is one specific event_registrations row — same shape as
// EditParticipantModal's `Contact`, so it can be edited/deleted in place.
type PersonEvent = Contact

type PersonSummary = {
  email: string
  nome: string
  cognome: string
  is_member: boolean
  member_id: string | null
  total_participations: number
  events: PersonEvent[]
  first_participation_at: string
  last_participation_at: string
}

type ParticipationData = {
  people: PersonSummary[]
  total_people: number
  total_participations: number
  members_count: number
  external_count: number
  distribution: Record<string, number>
}

type EventBreakdown = {
  event_id: string
  title: string
  date: string
  total_registrations: number
  members_count: number
  external_count: number
  checked_in_count: number
  no_show_count: number
  manual_count: number
  self_count: number
}

type QuarterTrend = { label: string; sortKey: number; participations: number; eventCount: number }

const PEOPLE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'member', label: 'Members' },
  { value: 'external', label: 'External' },
] as const

const PEOPLE_TEMPLATE = 'grid-cols-[minmax(0,1fr)_56px] sm:grid-cols-[minmax(0,1fr)_72px_56px_92px]'

function ParticipationTab() {
  const [participation, setParticipation] = useState<ParticipationData | null>(null)
  const [events, setEvents]               = useState<EventBreakdown[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [loading, setLoading]             = useState(true)
  const [memberFilter, setMemberFilter]   = useState<'all' | 'member' | 'external'>('all')
  const [nameSearch, setNameSearch]       = useState('')
  const [sortAsc, setSortAsc]             = useState(false)
  const [openEmail, setOpenEmail]         = useState<string | null>(null)
  const [editingEvent, setEditingEvent]   = useState<PersonEvent | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback((keepSelectedEvent: boolean) => {
    Promise.all([
      fetch('/api/admin/analytics/participation').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/analytics/events-breakdown').then(r => r.ok ? r.json() : null),
    ]).then(([partData, evData]) => {
      setParticipation(partData)
      const evs = (evData?.events ?? []) as EventBreakdown[]
      setEvents(evs)
      if (!keepSelectedEvent) {
        const firstWithRegs = evs.find(e => e.total_registrations > 0)
        setSelectedEventId(firstWithRegs?.event_id ?? '')
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => { loadData(false) }, [loadData])

  function handleEventEdited() {
    setEditingEvent(null)
    loadData(true)
  }

  async function handleEventDelete(id: string) {
    setDeletingId(id)
    const { ok } = await deleteParticipant(id)
    setDeleteConfirmId(null)
    setDeletingId(null)
    if (ok) loadData(true)
  }

  const people = useMemo(() => {
    let list = participation?.people ?? []
    if (memberFilter === 'member')   list = list.filter(p => p.is_member)
    if (memberFilter === 'external') list = list.filter(p => !p.is_member)
    const q = nameSearch.trim().toLowerCase()
    if (q) list = list.filter(p => `${p.nome} ${p.cognome}`.toLowerCase().includes(q))
    const sorted = [...list].sort((a, b) =>
      sortAsc ? a.total_participations - b.total_participations
              : b.total_participations - a.total_participations
    )
    return sorted
  }, [participation, memberFilter, nameSearch, sortAsc])

  const avgParticipations = participation && participation.total_people > 0
    ? Math.round((participation.total_participations / participation.total_people) * 10) / 10
    : 0

  const memberPctOfPeople = participation && participation.total_people > 0
    ? Math.round((participation.members_count / participation.total_people) * 100)
    : 0

  // Quarterly trend: groups every (person, event) participation by the real
  // event date (upcoming_events.date), not registration date.
  const quarterlyTrend = useMemo(() => {
    const byQuarter = new Map<string, { participations: number; eventIds: Set<string>; sortKey: number }>()
    for (const p of participation?.people ?? []) {
      for (const ev of p.events) {
        const dateStr = ev.upcoming_events?.date
        if (!dateStr) continue
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) continue
        const q = Math.floor(d.getMonth() / 3) + 1
        const label = `Q${q} ${d.getFullYear()}`
        const sortKey = d.getFullYear() * 10 + q
        let bucket = byQuarter.get(label)
        if (!bucket) {
          bucket = { participations: 0, eventIds: new Set(), sortKey }
          byQuarter.set(label, bucket)
        }
        bucket.participations += 1
        bucket.eventIds.add(ev.event_id)
      }
    }
    const result: QuarterTrend[] = Array.from(byQuarter.entries()).map(([label, b]) => ({
      label,
      sortKey: b.sortKey,
      participations: b.participations,
      eventCount: b.eventIds.size,
    }))
    return result.sort((a, b) => a.sortKey - b.sortKey)
  }, [participation])

  const maxQuarterParticipations = Math.max(...quarterlyTrend.map(q => q.participations), 1)

  const selectedEvent = events.find(e => e.event_id === selectedEventId) ?? null
  const person = (participation?.people ?? []).find(p => p.email === openEmail) ?? null

  const columns: Column[] = [
    { label: 'Name' },
    { label: 'Status', wide: true },
    { label: <button type="button" onClick={() => setSortAsc(v => !v)} className="rd-eyebrow text-[9px] text-earth-500 hover:text-night" title="Sort">Events {sortAsc ? '↑' : '↓'}</button>, align: 'right' },
    { label: 'Last', wide: true, align: 'right' },
  ]

  if (loading) return <Loading />

  return (
    <div>
      <Numbers items={[
        { value: participation?.total_participations ?? 0, label: 'Participations' },
        { value: participation?.total_people ?? 0, label: 'Unique people' },
        { value: `${memberPctOfPeople}%`, label: `Members · ${participation?.members_count ?? 0} of ${participation?.total_people ?? 0}` },
        { value: avgParticipations, label: 'Events per person' },
      ]} />

      <Section
        title="By event"
        meta={selectedEvent?.date}
        after={
          <div className="pt-4">
            <SelectField label="Event" value={selectedEventId} onChange={setSelectedEventId} width="sm:w-[360px]">
              {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}
            </SelectField>
          </div>
        }
      >
        {!selectedEvent ? <Empty>No events available.</Empty> : (
          <div className="mt-4 grid gap-x-12 sm:grid-cols-2">
            <div>
              <FieldRow label="Registered" value={selectedEvent.total_registrations} />
              <FieldRow label="Members" value={selectedEvent.members_count} aside={`${selectedEvent.external_count} external`} />
            </div>
            <div>
              <FieldRow label="Checked in" value={selectedEvent.checked_in_count} aside={`${selectedEvent.no_show_count} no-show`} />
              <FieldRow label="Added by hand" value={selectedEvent.manual_count} aside={`${selectedEvent.self_count} self`} />
            </div>
          </div>
        )}
      </Section>

      <Section title="Trend by quarter" meta="By event date">
        {quarterlyTrend.length === 0 ? <Empty>No dated events yet.</Empty> : quarterlyTrend.map(q => {
          const avgPerEvent = q.eventCount > 0 ? Math.round((q.participations / q.eventCount) * 10) / 10 : 0
          return (
            <BarRow
              key={q.label}
              label={`${q.label} · ${q.eventCount} event${q.eventCount !== 1 ? 's' : ''} · ~${avgPerEvent} per event`}
              value={q.participations}
              share={q.participations / maxQuarterParticipations}
            />
          )
        })}
      </Section>

      <div className="mt-10 flex flex-wrap items-end gap-x-6 gap-y-4">
        <SearchField value={nameSearch} onChange={setNameSearch} placeholder="Name…" />
        <div>
          <span className={`${labelCls} mb-2`}>Status</span>
          <SegmentedPills size="sm" label="Status" options={[...PEOPLE_FILTERS]} value={memberFilter} onChange={setMemberFilter} />
        </div>
      </div>

      <Split
        sheetRef={sheetRef}
        list={
          <CrmTable title="By person" meta={people.length} columns={columns} template={PEOPLE_TEMPLATE} isEmpty={people.length === 0} empty="No participation data.">
            {people.map(p => (
              <CrmRow
                key={p.email}
                template={PEOPLE_TEMPLATE}
                selected={p.email === openEmail}
                onOpen={() => { setOpenEmail(p.email); setDeleteConfirmId(null); revealSheet(sheetRef.current) }}
                label={`Open ${p.nome} ${p.cognome}`}
              >
                <span className={cell(columns[0])}><NameCell name={`${p.nome} ${p.cognome}`} sub={p.email} /></span>
                <span className={cell(columns[1], 'text-[12px] text-earth-700')}>{p.is_member ? 'Member' : 'External'}</span>
                <span className={cell(columns[2], 'rd-num font-serif text-[20px]')}>{p.total_participations}</span>
                <span className={cell(columns[3], 'rd-num text-[12px] text-earth-700')}>{fmtDate(p.last_participation_at)}</span>
              </CrmRow>
            ))}
          </CrmTable>
        }
        sheet={
          person ? (
            <Sheet title={`${person.nome} ${person.cognome}`} meta={person.is_member ? 'Member' : 'External'}>
              <FieldRow label="Email" value={person.email} />
              <FieldRow label="Events" value={person.total_participations} />
              <FieldRow label="First" value={fmtDate(person.first_participation_at)} />
              <FieldRow label="Last" value={fmtDate(person.last_participation_at)} />
              <div className="mt-8">
                <Heading title="Events attended" />
                <div className="border-t border-night">
                  {[...person.events].sort((a, b) => (a.upcoming_events?.date ?? '') < (b.upcoming_events?.date ?? '') ? 1 : -1).map(ev => (
                    <div key={ev.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-serif text-[19px] font-medium leading-[1.15]">{ev.upcoming_events?.title ?? 'Unknown'}</div>
                        <div className="mt-0.5 text-[12px] text-earth-600">{ev.upcoming_events?.date ? fmtDate(ev.upcoming_events.date) : '—'}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {deleteConfirmId === ev.id ? (
                          <>
                            <span className="text-[12px]">Delete?</span>
                            <button type="button" onClick={() => handleEventDelete(ev.id)} disabled={deletingId === ev.id} className="rd-italic text-[18px] text-[#8a2a1d] disabled:opacity-40">Yes</button>
                            <button type="button" onClick={() => setDeleteConfirmId(null)} className="rd-italic text-[18px]">No</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setEditingEvent(ev)} className="rd-italic text-[18px]">Modifica</button>
                            <button type="button" onClick={() => setDeleteConfirmId(ev.id)} className="rd-italic text-[18px] text-earth-600">Elimina</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Sheet>
          ) : (
            <SheetEmpty title="Person" text="Open a person to see every event attended." />
          )
        }
      />

      {editingEvent && (
        <EditParticipantModal
          contact={editingEvent}
          onSave={handleEventEdited}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview',           label: 'Overview' },
  { key: 'quarter-comparison', label: 'Quarters' },
  { key: 'linkedin',           label: 'LinkedIn' },
  { key: 'sponsors',           label: 'Sponsors' },
  { key: 'finance',            label: 'Finance' },
  { key: 'participation',      label: 'Partecipazione' },
]

/** Board ABa1d–ABa2d. Access is checked by the admin layout and again here. */
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

  if (!ready) return <Loading />

  return (
    <>
      <AdminNavbar userEmail={userEmail} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
        <a href={GA_URL} target="_blank" rel="noopener noreferrer" className={btnGhost}>Google Analytics</a>
      </div>

      {tab === 'overview'           && <OverviewTab />}
      {tab === 'quarter-comparison' && <QuarterComparisonTab />}
      {tab === 'linkedin'           && <LinkedInPostsTab />}
      {tab === 'sponsors'           && <SponsorsTab />}
      {tab === 'finance'            && <FinanceTab />}
      {tab === 'participation'      && <ParticipationTab />}
    </>
  )
}
