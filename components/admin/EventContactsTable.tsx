'use client'

import { useState, useEffect, useMemo } from 'react'

type Contact = {
  id: string
  nome: string
  cognome: string
  email: string
  telefono: string | null
  anno_di_studio: string
  motivazione: string | null
  questions_for_panelists: string | null
  created_at: string
  upcoming_events: {
    title: string
    date: string
  } | null
}

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return '—'
  return str.length > max ? str.slice(0, max) + '…' : str
}

function exportCSV(contacts: Contact[]) {
  const headers = ['Nome', 'Cognome', 'Email', 'Telefono', 'Anno', 'Evento', 'Data Evento', 'Campo', 'Registrato il']
  const rows = contacts.map(c => [
    c.nome,
    c.cognome,
    c.email,
    c.telefono ?? '',
    c.anno_di_studio,
    c.upcoming_events?.title ?? '',
    c.upcoming_events?.date ?? '',
    c.motivazione ?? c.questions_for_panelists ?? '',
    new Date(c.created_at).toLocaleDateString('it-IT'),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'event-contacts.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function EventContactsTable() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/crm/contacts')
      .then(r => r.json())
      .then(({ data, error: err }) => {
        if (err) setError(err)
        else setContacts(data ?? [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const events = useMemo(() => {
    const set = new Set(contacts.map(c => c.upcoming_events?.title).filter(Boolean) as string[])
    return Array.from(set).sort()
  }, [contacts])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return contacts.filter(c => {
      const matchSearch = !q ||
        c.nome?.toLowerCase().includes(q) ||
        c.cognome?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      const matchEvent = !eventFilter || c.upcoming_events?.title === eventFilter
      return matchSearch && matchEvent
    })
  }, [contacts, search, eventFilter])

  const uniqueEmails = useMemo(() => new Set(contacts.map(c => c.email)).size, [contacts])
  const eventsWithRegs = useMemo(() => new Set(contacts.map(c => c.upcoming_events?.title).filter(Boolean)).size, [contacts])

  if (loading) return <p className="text-sm text-[#6b7280] py-10 text-center">Loading…</p>
  if (error) return <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Contacts', value: contacts.length },
          { label: 'Unique Emails', value: uniqueEmails },
          { label: 'Events with Registrations', value: eventsWithRegs },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-[#e5e5e5] px-6 py-4">
            <p className="text-xs text-[#6b7280] uppercase tracking-widest font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#1a4a3a] mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#1a4a3a] w-64 transition-colors"
        />
        <select
          value={eventFilter}
          onChange={e => setEventFilter(e.target.value)}
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#1a4a3a] transition-colors"
        >
          <option value="">All Events</option>
          {events.map(ev => (
            <option key={ev} value={ev}>{ev}</option>
          ))}
        </select>

        <button
          onClick={() => exportCSV(filtered)}
          className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#f9f9f9]">
              {['Name', 'Email', 'Phone', 'Event', 'Date', 'Field'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#6b7280]">
                  No contacts found.
                </td>
              </tr>
            ) : filtered.map(c => {
              const field = c.motivazione ?? c.questions_for_panelists
              const isExpanded = expandedId === c.id
              return (
                <tr
                  key={c.id}
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="border-b border-black/5 last:border-0 cursor-pointer hover:bg-[#f9f9f9] transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-[#1a1a1a] whitespace-nowrap">
                    {c.nome} {c.cognome}
                  </td>
                  <td className="px-4 py-3 text-[#6b7280]">{c.email}</td>
                  <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-[#6b7280] max-w-[180px]">
                    <span title={c.upcoming_events?.title}>
                      {truncate(c.upcoming_events?.title, 40)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">
                    {c.upcoming_events?.date ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] max-w-[240px]">
                    {isExpanded ? (
                      <span className="whitespace-pre-wrap">{field ?? '—'}</span>
                    ) : (
                      <span>{truncate(field, 60)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
