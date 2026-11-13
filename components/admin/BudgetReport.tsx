'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Pill, SectionHeading, SegmentedPills } from '@/app/components/member/ui'
import { Numbers, errorCls } from './crm/ui'
import { budgetReport, pdfRequest, periodLabel, type CatRow, type PeriodMode, type TxType } from '@/lib/finance-view'

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

function fmtAmt(n: number) {
  return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const textAction = 'rd-italic text-[20px] hover:underline underline-offset-[0.18em] disabled:opacity-30'

const MONTHS_IT_FULL = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']

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

export default function BudgetReport() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<BudgetCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<PeriodMode>('mensile')
  const [offset, setOffset] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

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

  // The numbers of the period (lib/finance-view.ts): the same ones the PDF carries.
  const report = budgetReport(transactions, categories, mode, offset)
  const { entrate, uscite, saldoPeriodo, saldoCumulativo, catRows } = report

  async function handleExportPDF() {
    setExporting(true)
    setExportError(null)
    try {
      const { body, filename } = pdfRequest(mode, offset, report)
      const res = await fetch('/api/finance/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { setExportError('The PDF could not be generated.'); setExporting(false); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError('The PDF could not be generated.')
    }
    setExporting(false)
  }

  if (loading) return <p className="py-8 text-[13px] text-earth-600">Loading…</p>

  const label = periodLabel(mode, offset)

  return (
    <div>
      <Numbers items={[
        { value: fmtAmt(entrate), label: `Revenue, ${label}` },
        { value: fmtAmt(uscite), label: `Costs, ${label}` },
        { value: (saldoPeriodo >= 0 ? '+' : '-') + fmtAmt(Math.abs(saldoPeriodo)), label: 'Balance of the period' },
        { value: (saldoCumulativo >= 0 ? '+' : '-') + fmtAmt(Math.abs(saldoCumulativo)), label: 'Balance up to the period' },
      ]} />

      <div className="mt-9 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <SegmentedPills
            size="sm"
            label="Period"
            options={[{ value: 'mensile', label: 'Monthly' }, { value: 'trimestrale', label: 'Quarterly' }, { value: 'annuale', label: 'Yearly' }]}
            value={mode}
            onChange={m => { setMode(m); setOffset(0) }}
          />
          <div className="flex items-baseline gap-4">
            <button type="button" onClick={() => setOffset(o => o - 1)} className={textAction}>Prev</button>
            <span className="min-w-[130px] text-center font-serif text-[22px] font-medium">{label}</span>
            <button type="button" onClick={() => setOffset(o => Math.min(o + 1, 0))} disabled={offset >= 0} className={textAction}>Next</button>
          </div>
        </div>
        <Pill solid onClick={handleExportPDF} disabled={exporting}>{exporting ? 'Generating…' : 'Download PDF'}</Pill>
      </div>
      {exportError && <p role="alert" className={`${errorCls} mt-4`}>{exportError}</p>}

      {/* By category */}
      <section>
        <SectionHeading title="By category" meta={label} />
        <div className="border-t border-night/20">
          {catRows.length === 0 ? (
            <p className="py-8 text-[13px] text-earth-600">No transactions in this period.</p>
          ) : catRows.map(row => (
            <div key={row.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-night/20 py-3.5">
              <div className="min-w-0">
                <div className="font-serif text-[20px] font-medium leading-[1.2]">{row.name}</div>
                <div className="mt-0.5 text-[12px] text-earth-600">
                  {[row.entrate > 0 ? `in ${fmtAmt(row.entrate)}` : null, row.uscite > 0 ? `out ${fmtAmt(row.uscite)}` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              <span className={`rd-num font-serif text-[22px] font-medium ${row.saldo < 0 ? 'text-[#8a2a1d]' : ''}`}>
                {(row.saldo >= 0 ? '+' : '-') + fmtAmt(Math.abs(row.saldo))}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* A4 preview of the PDF */}
      <section>
        <SectionHeading title="PDF preview" meta="A4" />
        <div className="overflow-x-auto pt-2">
          <div style={{ width: 794, margin: '0 auto', paddingBottom: 64, boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
            <BudgetPreview period={label} catRows={catRows} entrate={entrate} uscite={uscite} saldo={saldoPeriodo} />
          </div>
        </div>
      </section>
    </div>
  )
}
