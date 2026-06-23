'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import AdminNavbar from '../components/AdminNavbar'

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'linkedin' | 'sponsors' | 'finance'

type Member = { role: string; created_at: string }
type Event  = { id: string; date: string }
type Booking = { id: string; status: string; is_member_free: boolean; slot_date: string; created_at: string }
type Report  = { id: string; title: string; description: string | null; pdf_url: string | null; created_at: string }
type Partner = { id: string; name: string; type: string; created_at: string }
type Transaction = { id: string; type: 'revenue' | 'cost' | 'rimborso'; amount: number; category_id: string | null }
type BudgetCategory = { id: string; name: string }
type JobOffer = { id: string; active: boolean }

// ── Helpers ────────────────────────────────────────────────────────────────────

function getQuarterStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString()
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtEuros(n: number): string {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Shared style constants ─────────────────────────────────────────────────────

const labelCls = 'text-[10px] font-semibold uppercase tracking-widest text-gray-500'
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
  const [members, setMembers]       = useState<Member[]>([])
  const [events, setEvents]         = useState<Event[]>([])
  const [totalRegs, setTotalRegs]   = useState(0)
  const [bookings, setBookings]     = useState<Booking[]>([])
  const [reports, setReports]       = useState<Report[]>([])
  const [jobs, setJobs]             = useState<JobOffer[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const db = createClient()
    const qs = getQuarterStart()
    const today = new Date().toISOString().slice(0, 10)

    Promise.all([
      db.from('club_members').select('role, created_at'),
      db.from('upcoming_events').select('id, date'),
      db.from('event_registrations').select('id', { count: 'exact', head: true }),
      db.from('career_bookings').select('id, status, is_member_free, slot_date, created_at'),
      db.from('featured_reports').select('id, title, description, pdf_url, created_at'),
      db.from('job_offers').select('id, active'),
    ]).then(([mRes, eRes, rRes, bRes, rpRes, jRes]) => {
      const ms = (mRes.data ?? []) as Member[]
      const es = (eRes.data ?? []) as Event[]
      const bs = (bRes.data ?? []) as Booking[]
      const rps = (rpRes.data ?? []) as Report[]
      const js = (jRes.data ?? []) as JobOffer[]

      setMembers(ms)
      setEvents(es)
      setTotalRegs(rRes.count ?? 0)
      setBookings(bs)
      setReports(rps)
      setJobs(js)
      setLoading(false)

      void qs; void today
    })
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

  const totalBookings        = bookings.length
  const confirmedBookings    = bookings.filter(b => b.status === 'confirmed').length
  const bookingsThisQuarter  = bookings.filter(b => b.created_at >= qs).length
  const memberFreeBookings   = bookings.filter(b => b.is_member_free).length

  const totalReports         = reports.length
  const reportsThisQuarter   = reports.filter(r => r.created_at >= qs).length
  const totalJobs            = jobs.length
  const activeJobs           = jobs.filter(j => j.active).length

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div>
      {/* Row 1 — Members */}
      <SectionLabel>Members</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Total Members"      value={totalMembers} />
        <KpiCard label="Board of Directors" value={membersBod} />
        <KpiCard label="Directors"          value={membersDirector} />
        <KpiCard label="Members"            value={membersMember} />
        <KpiCard label="New This Quarter"   value={newMembersThisQuarter} />
      </div>

      {/* Row 2 — Events */}
      <SectionLabel>Events</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Events"        value={totalEvents} />
        <KpiCard label="Upcoming Events"     value={upcomingEvents} />
        <KpiCard label="Total Registrations" value={totalRegs} />
        <KpiCard label="Avg Regs / Event"    value={avgRegs} />
      </div>

      {/* Row 3 — Career Service */}
      <SectionLabel>Career Service</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Bookings"    value={totalBookings} />
        <KpiCard label="Confirmed"         value={confirmedBookings} />
        <KpiCard label="This Quarter"      value={bookingsThisQuarter} />
        <KpiCard label="Member Free"       value={memberFreeBookings} />
      </div>

      {/* Row 4 — Content */}
      <SectionLabel>Content</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total Reports"        value={totalReports} />
        <KpiCard label="Reports This Quarter" value={reportsThisQuarter} />
        <KpiCard label="Total Job Offers"     value={totalJobs} />
        <KpiCard label="Active Job Offers"    value={activeJobs} />
      </div>
    </div>
  )
}

// ── LinkedIn Posts Tab ─────────────────────────────────────────────────────────

function LinkedInPostsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient()
      .from('featured_reports')
      .select('id, title, description, pdf_url, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setReports((data ?? []) as Report[])
        setLoading(false)
      })
  }, [])

  const qs           = getQuarterStart()
  const thisQuarter  = reports.filter(r => r.created_at >= qs).length

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mb-8">
        <KpiCard label="Total Posts All Time" value={reports.length} />
        <KpiCard label="Posts This Quarter"   value={thisQuarter} />
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 border border-dashed border-gray-200 text-center">
          No posts recorded yet.
        </p>
      ) : (
        <div className="border border-gray-200">
          {reports.map((r, i) => (
            <div key={r.id}
              className={`flex items-start gap-4 px-5 py-4 bg-white hover:bg-[#fafaf9] transition-colors ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 leading-snug">{r.title}</p>
                {r.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{r.description}</p>
                )}
              </div>
              <div className="flex items-center gap-5 flex-shrink-0 pt-0.5">
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {fmtDate(r.created_at)}
                </span>
                {r.pdf_url ? (
                  <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
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

  const sponsors = partners.filter(p => p.type === 'sponsor').length
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
          {/* Table header */}
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
  { key: 'overview',  label: 'Overview' },
  { key: 'linkedin',  label: 'LinkedIn Posts' },
  { key: 'sponsors',  label: 'Sponsors' },
  { key: 'finance',   label: 'Finance' },
]

export default function AdminAnalyticsPage() {
  const router                          = useRouter()
  const [userEmail, setUserEmail]       = useState('')
  const [ready, setReady]               = useState(false)
  const [tab, setTab]                   = useState<Tab>('overview')

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

            {/* GA4 external link — outside tabs */}
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
          <div className="flex gap-0 border-b border-gray-200 mb-8">
            {TABS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
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
          {tab === 'overview' && <OverviewTab />}
          {tab === 'linkedin' && <LinkedInPostsTab />}
          {tab === 'sponsors' && <SponsorsTab />}
          {tab === 'finance'  && <FinanceTab />}

        </div>
      </main>
    </>
  )
}
