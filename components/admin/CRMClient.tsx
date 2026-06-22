'use client'

import { useState } from 'react'
import MembersTable from './MembersTable'
import EventContactsTable from './EventContactsTable'

const TABS = [
  { key: 'members', label: 'Members' },
  { key: 'contacts', label: 'Event Contacts' },
] as const

type Tab = typeof TABS[number]['key']

export default function CRMClient() {
  const [tab, setTab] = useState<Tab>('members')

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h2 className="font-serif text-2xl font-bold text-forest">CRM</h2>
        <div className="w-8 h-px bg-forest mt-2" />
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-line-faint mb-8">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
              tab === t.key
                ? 'text-forest border-b-2 border-forest'
                : 'text-ink-500 hover:text-ink-900 border-b-2 border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'members' && <MembersTable />}
      {tab === 'contacts' && <EventContactsTable />}
    </div>
  )
}
