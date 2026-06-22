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

function SummaryCard({ label, value, dark }: { label: string; value: string; dark?: boolean }) {
  return (
    <div
      className="px-5 py-4 border"
      style={dark ? { backgroundColor: '#1a4a3a', borderColor: '#1a4a3a' } : { backgroundColor: 'white', borderColor: '#e5e5e5' }}
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
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex border border-line overflow-hidden">
            {(['mensile', 'trimestrale', 'annuale'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setOffset(0) }}
                className="px-4 py-2 text-xs font-medium uppercase tracking-wide transition-colors"
                style={mode === m
                  ? { backgroundColor: '#1a4a3a', color: 'white' }
                  : { backgroundColor: 'white', color: '#6b7280' }
                }
              >
                {m === 'mensile' ? 'Mensile' : m === 'trimestrale' ? 'Trimestrale' : 'Annuale'}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOffset(o => o - 1)}
              className="p-1.5 border border-line text-ink-400 hover:text-ink-900 hover:border-[#1a4a3a] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="px-3 text-sm font-medium text-ink-900 min-w-[120px] text-center">{label}</span>
            <button
              onClick={() => setOffset(o => Math.min(o + 1, 0))}
              disabled={offset >= 0}
              className="p-1.5 border border-line text-ink-400 hover:text-ink-900 hover:border-[#1a4a3a] transition-colors disabled:opacity-30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium uppercase tracking-widest px-5 py-2.5 transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? 'Generazione…' : 'Export PDF'}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Entrate" value={fmtAmt(entrate)} />
        <SummaryCard label="Uscite" value={fmtAmt(uscite)} />
        <SummaryCard label="Saldo Periodo" value={fmtAmt(saldoPeriodo)} />
        <SummaryCard label="Saldo Cumulativo" value={fmtAmt(saldoCumulativo)} dark />
      </div>

      {/* Category breakdown table */}
      <div className="border border-line overflow-x-auto">
        <table className="w-full text-sm font-['Inter'] border-collapse">
          <thead>
            <tr className="border-b border-line bg-[#f9f9f9]">
              {['CATEGORIA', 'ENTRATE', 'USCITE', 'SALDO'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {catRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-ink-400 text-sm py-10">
                  Nessuna transazione per questo periodo.
                </td>
              </tr>
            ) : (
              catRows.map((row, i) => (
                <tr key={i} className="border-b border-black/5 last:border-0 hover:bg-[#f9f9f9] transition-colors">
                  <td className="px-4 py-3 text-ink-900 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-green-700 font-semibold tabular-nums">
                    {row.entrate > 0 ? fmtAmt(row.entrate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-red-700 font-semibold tabular-nums">
                    {row.uscite > 0 ? fmtAmt(row.uscite) : '—'}
                  </td>
                  <td className={`px-4 py-3 font-bold tabular-nums ${row.saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {row.saldo >= 0 ? '+' : ''}{fmtAmt(row.saldo)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {catRows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#1a4a3a]/20 bg-[#f0f5f3]">
                <td className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-ink-600">Totale</td>
                <td className="px-4 py-3 font-bold text-green-700 tabular-nums">{fmtAmt(entrate)}</td>
                <td className="px-4 py-3 font-bold text-red-700 tabular-nums">{fmtAmt(uscite)}</td>
                <td className={`px-4 py-3 font-bold tabular-nums ${saldoPeriodo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {saldoPeriodo >= 0 ? '+' : ''}{fmtAmt(saldoPeriodo)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
