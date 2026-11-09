'use client'

import { useState } from 'react'
import { Tabs } from '@/app/components/member/ui'
import MembersTable from './MembersTable'
import EventContactsTable from './EventContactsTable'
import SponsorsTable from './SponsorsTable'
import CustomersTable from './CustomersTable'

const TABS = [
  { key: 'members',   label: 'Members' },
  { key: 'contacts',  label: 'Event contacts' },
  { key: 'sponsors',  label: 'Sponsors' },
  { key: 'customers', label: 'Clienti' },
] as const

type Tab = typeof TABS[number]['key']

/** Board ABc1d–ABc4d: one tab per list, each with its numbers, list and sheet. */
export default function CRMClient() {
  const [tab, setTab] = useState<Tab>('members')

  return (
    <div>
      <div className="mb-6">
        <Tabs tabs={TABS.map(t => ({ key: t.key, label: t.label }))} value={tab} onChange={setTab} />
      </div>

      {tab === 'members'   && <MembersTable />}
      {tab === 'contacts'  && <EventContactsTable />}
      {tab === 'sponsors'  && <SponsorsTable />}
      {tab === 'customers' && <CustomersTable />}
    </div>
  )
}
