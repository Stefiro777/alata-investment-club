/**
 * The tabs of Board > Finance. They live here, not in FinanceClient.tsx: that file is a
 * Client Component, and a function exported from it cannot be called by the page (a Server
 * Component): Next throws "Attempted to call isFinanceTab() from the server".
 */

export type FinanceTab = 'transactions' | 'budget' | 'documents' | 'quotes'

export const FINANCE_TABS: { key: FinanceTab; label: string }[] = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'budget', label: 'Budget' },
  { key: 'documents', label: 'Documents' },
  { key: 'quotes', label: 'Quotes' },
]

export const isFinanceTab = (v: unknown): v is FinanceTab => FINANCE_TABS.some(t => t.key === v)
