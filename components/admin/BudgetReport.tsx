'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type TxType = 'revenue' | 'cost' | 'rimborso'

type Transaction = {
  id: string
  type: TxType
  date: string
  amount: number
  category_id: string | null
}

type BudgetCategory = {
  id: string
  name: string
  type: string
}

type PeriodMode = 'mensile' | 'trimestrale' | 'annuale'

const MONTH_NAMES_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
const MONTH_NAMES_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

function fmtAmt(n: number) {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function periodLabel(mode: PeriodMode, offset: number): string {
  const now = new Date()
  if (mode === 'mensile') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return `${MONTH_NAMES_FULL[d.getMonth()]} ${d.getFullYear()}`
  }
  if (mode === 'trimestrale') {
    const totalQ = Math.floor(now.getMonth() / 3) + now.getFullYear() * 4 + offset
    const year = Math.floor(totalQ / 4)
    const q = totalQ % 4 + 1
    return `Q${q} ${year}`
  }
  return String(now.getFullYear() + offset)
}

function inPeriod(dateStr: string, mode: PeriodMode, offset: number): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  if (mode === 'mensile') {
    const ref = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
  }
  if (mode === 'trimestrale') {
    const totalQ = Math.floor(now.getMonth() / 3) + now.getFullYear() * 4 + offset
    const year = Math.floor(totalQ / 4)
    const q = totalQ % 4
    const txQ = Math.floor(d.getMonth() / 3)
    return d.getFullYear() === year && txQ === q
  }
  return d.getFullYear() === now.getFullYear() + offset
}

function beforeOrInPeriod(dateStr: string, mode: PeriodMode, offset: number): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  if (mode === 'mensile') {
    const ref = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
    return d <= ref
  }
  if (mode === 'trimestrale') {
    const totalQ = Math.floor(now.getMonth() / 3) + now.getFullYear() * 4 + offset
    const year = Math.floor(totalQ / 4)
    const q = (totalQ % 4) + 1
    const endMonth = q * 3
    const endOfQ = new Date(year, endMonth, 0)
    return d <= endOfQ
  }
  const year = now.getFullYear() + offset
  return d <= new Date(year, 11, 31)
}

const MONTHS_IT_FULL = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

interface CatRow { name: string; entrate: number; uscite: number; saldo: number }

function BudgetPreview({ period, catRows, entrate, uscite, saldo }: {
  period: string; catRows: CatRow[]; entrate: number; uscite: number; saldo: number
}) {
  const now = new Date()
  const todayStr = `${now.getDate()} ${MONTHS_IT_FULL[now.getMonth()]} ${now.getFullYear()}`

  return (
    <div style={{ background: 'white', border: '1px solid #e5e5e5', fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 13, color: '#000', minHeight: 640 }}>
      {/* Header band */}
      <div style={{ background: 'var(--forest)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>ALATA INVESTMENT CLUB</p>
          <p style={{ margin: '3px 0 0', fontSize: 9, color: '#b8d4c8' }}>RENDICONTO FINANZIARIO</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>BUDGET REPORT</p>
            <p style={{ margin: '3px 0 0', fontSize: 9, color: '#b8d4c8' }}>{period}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white.png" alt="Alata" style={{ height: 36, width: 'auto' }} />
        </div>
      </div>

      <div style={{ padding: '18px 24px' }}>
        {/* Info block */}
        <p style={{ fontSize: 10, margin: '0 0 3px' }}><strong>Periodo:</strong> {period}</p>
        <p style={{ fontSize: 10, margin: '0 0 16px' }}><strong>Data di redazione:</strong> Brescia, {todayStr}</p>

        {/* Category table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 0 }}>
          <thead>
            <tr style={{ background: 'var(--forest)', color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: 9 }}>CATEGORIA</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, fontSize: 9 }}>ENTRATE</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, fontSize: 9 }}>USCITE</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, fontSize: 9 }}>SALDO</th>
            </tr>
          </thead>
          <tbody>
            {catRows.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '14px 8px', color: '#9ca3af', textAlign: 'center' }}>Nessuna transazione per questo periodo.</td></tr>
            ) : catRows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#f8f8f8' : '#fff' }}>
                <td style={{ padding: '6px 8px' }}>{row.name}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.entrate > 0 ? fmtAmt(row.entrate) : '—'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{row.uscite > 0 ? fmtAmt(row.uscite) : '—'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{(row.saldo >= 0 ? '+' : '') + fmtAmt(Math.abs(row.saldo))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#edf7f0', borderTop: '2px solid #1a4a3a' }}>
              <td style={{ padding: '8px', fontWeight: 700, fontSize: 11 }}>TOTALE</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{fmtAmt(entrate)}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{fmtAmt(uscite)}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{(saldo >= 0 ? '+' : '') + fmtAmt(Math.abs(saldo))}</td>
            </tr>
          </tfoot>
        </table>

        {/* Signature block */}
        <div style={{ marginTop: 30, paddingTop: 10, borderTop: '1px solid #1a4a3a' }}>
          <p style={{ fontWeight: 700, fontSize: 9, margin: '0 0 4px' }}>Alata Investment Club — Il Presidente</p>
          <p style={{ fontSize: 8, color: '#777', margin: 0 }}>alatainvestmentclub.com — info@alatainvestmentclub.com</p>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div
      className="px-5 py-4 border"
      style={dark ? { backgroundColor: 'var(--forest)', borderColor: 'var(--forest)' } : { backgroundColor: 'white', borderColor: '#e5e5e5' }}
    >
      <p className="text-[10px] uppercase tracking-widest font-medium mb-1" style={{ color: dark ? 'rgba(255,255,255,0.65)' : '#9ca3af' }}>
        {label}
      </p>
      <p className="text-lg font-bold" style={{ color: dark ? 'white' : '#1a1a1a' }}>
        {value}
      </p>
    </div>
  )
}

export default function BudgetReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<PeriodMode>('mensile')
  const [offset, setOffset] = useState(0)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('transactions').select('id, type, date, amount, category_id'),
      supabase.from('budget_categories').select('id, name, type').order('name'),
    ]).then(([{ data: txs }, { data: cats }]) => {
      setTransactions((txs ?? []) as Transaction[])
      setCategories((cats ?? []) as BudgetCategory[])
      setLoading(false)
    })
  }, [])

  const periodTxs = transactions.filter(t => inPeriod(t.date, mode, offset))
  const allUpTo = transactions.filter(t => beforeOrInPeriod(t.date, mode, offset))

  const entrate = periodTxs.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const uscite = periodTxs.filter(t => t.type === 'cost' || t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
  const saldoPeriodo = entrate - uscite

  const totalRevAll = allUpTo.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const totalCostAll = allUpTo.filter(t => t.type === 'cost' || t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
  const saldoCumulativo = totalRevAll - totalCostAll

  // Category breakdown
  const catRows = categories.map(cat => {
    const catTxs = periodTxs.filter(t => t.category_id === cat.id)
    const catEntrate = catTxs.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
    const catUscite = catTxs.filter(t => t.type === 'cost' || t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
    return { name: cat.name, entrate: catEntrate, uscite: catUscite, saldo: catEntrate - catUscite }
  }).filter(r => r.entrate > 0 || r.uscite > 0)

  // Uncategorized
  const uncatTxs = periodTxs.filter(t => !t.category_id)
  const uncatEntrate = uncatTxs.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const uncatUscite = uncatTxs.filter(t => t.type === 'cost' || t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
  if (uncatEntrate > 0 || uncatUscite > 0) {
    catRows.push({ name: '(Non categorizzato)', entrate: uncatEntrate, uscite: uncatUscite, saldo: uncatEntrate - uncatUscite })
  }

  async function handleExportPDF() {
    setExporting(true)
    try {
      const res = await fetch('/api/finance/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: periodLabel(mode, offset),
          summary: { entrate, uscite, saldo: saldoPeriodo, saldoCumulativo },
          categories: catRows,
        }),
      })
      if (!res.ok) { setExporting(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bilancio-${periodLabel(mode, offset).replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // noop
    }
    setExporting(false)
  }

  if (loading) return <p className="text-sm text-ink-500 py-8">Caricamento...</p>

  const label = periodLabel(mode, offset)

  return (
    <div className="space-y-4">
      {/* Controls + download button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex border border-line overflow-hidden">
            {(['mensile', 'trimestrale', 'annuale'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setOffset(0) }}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors"
                style={mode === m ? { backgroundColor: 'var(--forest)', color: 'white' } : { backgroundColor: 'white', color: '#6b7280' }}
              >
                {m === 'mensile' ? 'Mensile' : m === 'trimestrale' ? 'Trimestrale' : 'Annuale'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setOffset(o => o - 1)} className="p-1.5 border border-line text-ink-400 hover:text-ink-900 hover:border-forest transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="px-3 text-sm font-medium text-ink-900 min-w-[120px] text-center">{label}</span>
            <button onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0} className="p-1.5 border border-line text-ink-400 hover:text-ink-900 hover:border-forest transition-colors disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase tracking-widest px-4 py-2 transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? 'Generazione…' : 'Scarica PDF'}
        </button>
      </div>

      {/* A4 preview */}
      <div className="overflow-x-auto">
        <div style={{ width: 794, margin: '0 auto', paddingBottom: 64, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
          <BudgetPreview period={label} catRows={catRows} entrate={entrate} uscite={uscite} saldo={saldoPeriodo} />
        </div>
      </div>
    </div>
  )
}
