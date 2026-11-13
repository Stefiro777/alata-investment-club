'use client'

import { useState, type ComponentProps } from 'react'
import { Tabs } from '@/app/components/member/ui'
import TransactionManager from './TransactionManager'
import BudgetReport from './BudgetReport'
import QuoteClient from './QuoteClient'
import ArchiveClient from '@/app/admin/archive/ArchiveClient'
import { FINANCE_TABS, type FinanceTab } from '@/lib/finance-tabs'

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
        <Tabs tabs={FINANCE_TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'transactions' && <TransactionManager />}
      {tab === 'budget' && <BudgetReport />}
      {tab === 'documents' && <ArchiveClient initialDocs={documents} userEmail={userEmail} />}
      {tab === 'quotes' && <QuoteClient />}
    </div>
  )
}
