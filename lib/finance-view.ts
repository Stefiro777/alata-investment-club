/**
 * The rules of the Finance screens, apart from how they look: totals, which
 * payments can be refunded, the payload saved for a transaction, and the budget
 * report (period, category rows, the body sent to /api/finance/pdf).
 * They are the contract of docs/finance-regression-checklist.md and are covered by tests.
 */

export type TxType = 'revenue' | 'cost' | 'rimborso'

export type TxLike = {
  id: string
  type: TxType
  date: string
  amount: number
  category_id?: string | null
  stripe_payment_intent_id?: string | null
  stripe_refund_id?: string | null
  refund_of?: string | null
  source_type?: 'membership' | 'event' | 'merch' | 'career' | null
}

export const monthKey = (date: string) => date.slice(0, 7)

/** Money going out: costs and refunds both count against the balance. */
export const isOutflow = (t: { type: TxType }) => t.type === 'cost' || t.type === 'rimborso'

export function totals(txs: readonly { type: TxType; amount: number }[]) {
  const revenue = txs.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const costs = txs.filter(isOutflow).reduce((s, t) => s + t.amount, 0)
  return { revenue, costs, balance: revenue - costs }
}

// ── Refunds ───────────────────────────────────────────────────────────────────

/** Ids of payments that already have a refund row. */
export function refundedIds(txs: readonly TxLike[]): Set<string> {
  return new Set(txs.map(t => t.refund_of).filter(Boolean) as string[])
}

/**
 * A payment can be refunded from here when it is a Stripe revenue of an event, merch
 * or career payment, not already refunded. Membership payments never are.
 */
export function canRefund(t: TxLike, refunded: ReadonlySet<string>): boolean {
  return (
    t.type === 'revenue' &&
    !!t.stripe_payment_intent_id &&
    !t.stripe_refund_id &&
    (t.source_type === 'event' || t.source_type === 'merch' || t.source_type === 'career') &&
    !refunded.has(t.id)
  )
}

/** Body of POST /api/finance/refund. */
export const refundBody = (transactionId: string) => ({ transactionId, confirm: true as const })

// ── The transaction form ──────────────────────────────────────────────────────

export type TxForm = {
  type: 'revenue' | 'cost'
  isRimborso: boolean
  date: string
  amount: string
  description: string
  category_id: string
  note: string
  receipt_url: string
}

export function emptyTxForm(date: string): TxForm {
  return { type: 'revenue', isRimborso: false, date, amount: '', description: '', category_id: '', note: '', receipt_url: '' }
}

export function txToForm(tx: { type: TxType; date: string; amount: number; description: string; category_id: string | null; note: string | null; receipt_url: string | null }): TxForm {
  return {
    type: tx.type === 'rimborso' ? 'cost' : tx.type,
    isRimborso: tx.type === 'rimborso',
    date: tx.date,
    amount: tx.amount.toString(),
    description: tx.description,
    category_id: tx.category_id ?? '',
    note: tx.note ?? '',
    receipt_url: tx.receipt_url ?? '',
  }
}

export const effectiveType = (f: Pick<TxForm, 'type' | 'isRimborso'>): TxType => (f.isRimborso ? 'rimborso' : f.type)

/** What is written to `transactions` on add and on edit; null when the form is not valid. */
export function buildTxPayload(f: TxForm) {
  const amount = parseFloat(String(f.amount))
  if (!f.description.trim() || isNaN(amount) || amount <= 0) return null
  return {
    type: effectiveType(f),
    date: f.date,
    amount,
    description: f.description.trim(),
    category_id: f.category_id || null,
    note: f.note.trim() || null,
    receipt_url: f.receipt_url || null,
  }
}

/** Categories offered for a type: those of that type, or 'both', or with no type. */
export function categoriesFor<C extends { type: string | null }>(cats: readonly C[], type: TxType): C[] {
  return cats.filter(c => {
    if (!c.type || c.type === 'both') return true
    if (type === 'revenue') return c.type === 'revenue'
    return c.type === 'cost'
  })
}

// ── Budget report ─────────────────────────────────────────────────────────────

export type PeriodMode = 'mensile' | 'trimestrale' | 'annuale'

const MONTHS_FULL = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

/** "Novembre 2026", "Q4 2026" or "2026": the name of the period, also used in the PDF. */
export function periodLabel(mode: PeriodMode, offset: number, now: Date = new Date()): string {
  if (mode === 'mensile') {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
    return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
  }
  if (mode === 'trimestrale') {
    const totalQ = Math.floor(now.getMonth() / 3) + now.getFullYear() * 4 + offset
    const year = Math.floor(totalQ / 4)
    const q = totalQ % 4 + 1
    return `Q${q} ${year}`
  }
  return String(now.getFullYear() + offset)
}

export function inPeriod(dateStr: string, mode: PeriodMode, offset: number, now: Date = new Date()): boolean {
  const d = new Date(dateStr)
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

export function beforeOrInPeriod(dateStr: string, mode: PeriodMode, offset: number, now: Date = new Date()): boolean {
  const d = new Date(dateStr)
  if (mode === 'mensile') {
    const ref = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
    return d <= ref
  }
  if (mode === 'trimestrale') {
    const totalQ = Math.floor(now.getMonth() / 3) + now.getFullYear() * 4 + offset
    const year = Math.floor(totalQ / 4)
    const q = (totalQ % 4) + 1
    const endOfQ = new Date(year, q * 3, 0)
    return d <= endOfQ
  }
  return d <= new Date(now.getFullYear() + offset, 11, 31)
}

export type CatRow = { name: string; entrate: number; uscite: number; saldo: number }

type BudgetTx = { type: TxType; date: string; amount: number; category_id: string | null }

/** The numbers of a period: totals, the running balance up to it, and one row per used category. */
export function budgetReport(
  txs: readonly BudgetTx[],
  cats: readonly { id: string; name: string }[],
  mode: PeriodMode,
  offset: number,
  now: Date = new Date(),
) {
  const periodTxs = txs.filter(t => inPeriod(t.date, mode, offset, now))
  const upTo = txs.filter(t => beforeOrInPeriod(t.date, mode, offset, now))

  const sum = (list: readonly BudgetTx[], out: boolean) =>
    list.filter(t => (out ? isOutflow(t) : t.type === 'revenue')).reduce((s, t) => s + t.amount, 0)

  const entrate = sum(periodTxs, false)
  const uscite = sum(periodTxs, true)
  const saldoPeriodo = entrate - uscite
  const saldoCumulativo = sum(upTo, false) - sum(upTo, true)

  const catRows: CatRow[] = cats
    .map(cat => {
      const list = periodTxs.filter(t => t.category_id === cat.id)
      const e = sum(list, false)
      const u = sum(list, true)
      return { name: cat.name, entrate: e, uscite: u, saldo: e - u }
    })
    .filter(r => r.entrate > 0 || r.uscite > 0)

  const uncat = periodTxs.filter(t => !t.category_id)
  const ue = sum(uncat, false)
  const uu = sum(uncat, true)
  if (ue > 0 || uu > 0) catRows.push({ name: '(Non categorizzato)', entrate: ue, uscite: uu, saldo: ue - uu })

  return { entrate, uscite, saldoPeriodo, saldoCumulativo, catRows }
}

/** Body of POST /api/finance/pdf and the name of the downloaded file. */
export function pdfRequest(mode: PeriodMode, offset: number, report: ReturnType<typeof budgetReport>, now: Date = new Date()) {
  const period = periodLabel(mode, offset, now)
  return {
    body: {
      period,
      summary: { entrate: report.entrate, uscite: report.uscite, saldo: report.saldoPeriodo, saldoCumulativo: report.saldoCumulativo },
      categories: report.catRows,
    },
    filename: `bilancio-${period.replace(/\s+/g, '-')}.pdf`,
  }
}
