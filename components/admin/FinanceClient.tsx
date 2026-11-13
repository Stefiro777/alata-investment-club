'use client'

import { useState, type ComponentProps } from 'react'
import { Tabs } from '@/app/components/member/ui'
import TransactionManager from './TransactionManager'
import BudgetReport from './BudgetReport'
import QuoteClient from './QuoteClient'
import ArchiveClient from '@/app/admin/archive/ArchiveClient'

export type FinanceTab = 'transactions' | 'budget' | 'documents' | 'quotes'

const TABS: { key: FinanceTab; label: string }[] = [
  { key: 'transactions', label: 'Transactions' },
  { key: 'budget', label: 'Budget' },
  { key: 'documents', label: 'Documents' },
  { key: 'quotes', label: 'Quotes' },
]

export const isFinanceTab = (v: unknown): v is FinanceTab => TABS.some(t => t.key === v)

/** Board > Finance: the four screens as tabs. Documents (the archive) come from the server. */
export default function FinanceClient({ documents, userEmail, initialTab = 'transactions' }: {
  documents: ComponentProps<typeof ArchiveClient>['initialDocs']
  userEmail: string
  initialTab?: FinanceTab
}) {
  const [tab, setTab] = useState<FinanceTab>(initialTab)

  return (
    <div>
      <div className="mb-6">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'transactions' && <TransactionManager />}
      {tab === 'budget' && <BudgetReport />}
      {tab === 'documents' && <ArchiveClient initialDocs={documents} userEmail={userEmail} />}
      {tab === 'quotes' && <QuoteClient />}
    </div>
  )
}
