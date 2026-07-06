'use client'

import { useState } from 'react'
import TransactionManager from './TransactionManager'
import BudgetReport from './BudgetReport'
import FinanceDocuments from './FinanceDocuments'
import QuoteClient from './QuoteClient'

type Tab = 'transactions' | 'budget' | 'documents' | 'preventivo'

export default function FinanceClient() {
  const [tab, setTab] = useState<Tab>('transactions')

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-ink-900">Finance</h1>
        <div className="w-10 h-0.5 bg-forest mt-2" />
      </div>

      {/* Sub-tab bar */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-6">
          {([
            { key: 'transactions' as const, label: 'Transactions' },
            { key: 'budget'       as const, label: 'Budget Report' },
            { key: 'preventivo'   as const, label: 'Preventivo' },
            { key: 'documents'    as const, label: 'Documents' },
          ] as const).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="pb-2 text-sm font-['Inter'] transition-colors"
              style={
                tab === t.key
                  ? { borderBottom: '2px solid #1a4a3a', color: 'var(--forest)', fontWeight: 600 }
                  : { borderBottom: '2px solid transparent', color: '#9ca3af' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'transactions' ? <TransactionManager /> :
       tab === 'budget'       ? <BudgetReport /> :
       tab === 'preventivo'   ? <QuoteClient /> :
                                <FinanceDocuments />}
    </div>
  )
}
