'use client'

import { useState, useEffect, useMemo } from 'react'
import { TEAM_BADGE } from '@/app/dashboard/teamColors'

type Member = {
  id: string
  full_name: string
  email: string
  role: string
  team: string
  created_at: string
}

// ── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({
  recipients,
  onClose,
}: {
  recipients: Member[]
  onClose: () => void
}) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const CHIP_LIMIT = 10
  const visibleRecipients = recipients.slice(0, CHIP_LIMIT)
  const overflow = recipients.length - CHIP_LIMIT

  async function handleSend() {
    if (!subject.trim() || !message.trim()) return
    setStatus('sending')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/crm/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients.map(m => ({ email: m.email, name: m.full_name })),
          subject: subject.trim(),
          message: message.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setErrorMsg(json.error ?? 'Failed to send')
        setStatus('error')
      } else {
        setResult(json)
        setStatus('done')
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setStatus('error')
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-[#d1d5db] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#1a1a1a] bg-white transition-colors'

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 9999 }}
      onClick={e => { if (e.target === e.currentTarget && status !== 'sending') onClose() }}
    >
      <div className="bg-white border border-[#e5e5e5] w-full max-w-lg shadow-xl">
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#e5e5e5]">
          <div>
            <p className="font-serif text-base font-bold text-[#1a4a3a] uppercase tracking-widest">
              Send Email
            </p>
            <p className="text-xs text-[#6b7280] mt-0.5">{recipients.length} recipient{recipients.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            disabled={status === 'sending'}
            className="text-[#6b7280] hover:text-[#1a1a1a] text-xl leading-none transition-colors ml-4 mt-0.5 disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {status === 'done' && result ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-[#1a4a3a] font-medium text-sm tracking-wide">
                ✓ Sent: {result.sent} — Failed: {result.failed}
              </p>
              <button
                onClick={onClose}
                className="mt-4 border border-[#d1d5db] text-[#6b7280] hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Recipient chips */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {visibleRecipients.map(m => (
                  <span key={m.id} className="text-[11px] bg-[#f0f5f3] text-[#1a4a3a] px-2 py-1 border border-[#c8ddd6]">
                    {m.full_name}
                  </span>
                ))}
                {overflow > 0 && (
                  <span className="text-[11px] bg-[#f3f4f6] text-[#6b7280] px-2 py-1 border border-[#e5e5e5]">
                    +{overflow} others
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-widest mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  disabled={status === 'sending'}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-widest mb-1">Message</label>
                <textarea
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={status === 'sending'}
                  placeholder="Write your message here…"
                  className={`${inputClass} resize-none`}
                />
                <p className="text-[11px] text-[#9ca3af] mt-1">
                  [Nome] will be replaced with each member's name.
                </p>
              </div>

              {status === 'error' && errorMsg && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-black/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={status === 'sending'}
                  className="border border-[#d1d5db] text-[#6b7280] hover:bg-[#f3f4f6] text-xs font-medium tracking-wide px-5 py-2.5 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={status === 'sending' || !subject.trim() || !message.trim()}
                  className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MembersTable() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [composeOpen, setComposeOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/crm/members')
      .then(r => r.json())
      .then(({ data, error: err }) => {
        if (err) setError(err)
        else setMembers(data ?? [])
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const teams = useMemo(() => {
    const set = new Set(members.map(m => m.team).filter(Boolean))
    return Array.from(set).sort()
  }, [members])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter(m => {
      const matchSearch = !q || m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.team?.toLowerCase().includes(q)
      const matchTeam = !teamFilter || m.team === teamFilter
      return matchSearch && matchTeam
    })
  }, [members, search, teamFilter])

  const bodCount = members.filter(m => m.role === 'bod').length
  const directorCount = members.filter(m => m.role === 'director').length

  const allFilteredIds = filtered.map(m => m.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedMembers = members.filter(m => selected.has(m.id))

  if (loading) return <p className="text-sm text-[#6b7280] py-10 text-center">Loading…</p>
  if (error) return <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Members', value: members.length },
          { label: 'BoD', value: bodCount },
          { label: 'Directors', value: directorCount },
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
          placeholder="Search by name, email, team…"
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#1a4a3a] w-64 transition-colors"
        />
        <select
          value={teamFilter}
          onChange={e => setTeamFilter(e.target.value)}
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#1a4a3a] transition-colors"
        >
          <option value="">All Teams</option>
          {teams.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {selected.size > 0 && (
          <button
            onClick={() => setComposeOpen(true)}
            className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors"
          >
            Send Email ({selected.size})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#f9f9f9]">
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              {['Name', 'Email', 'Role', 'Team', 'Joined'].map(h => (
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
                  No members found.
                </td>
              </tr>
            ) : filtered.map(m => {
              const isSelected = selected.has(m.id)
              const teamBadge = TEAM_BADGE[m.team]
              const roleBadge = TEAM_BADGE[m.role]
              return (
                <tr
                  key={m.id}
                  onClick={() => toggleRow(m.id)}
                  className={`border-b border-black/5 last:border-0 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#f0f5f3]' : 'hover:bg-[#f9f9f9]'
                  }`}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(m.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-[#1a1a1a] whitespace-nowrap">{m.full_name}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{m.email}</td>
                  <td className="px-4 py-3">
                    {roleBadge ? (
                      <span
                        className="text-[10px] font-medium tracking-widest uppercase px-2 py-1"
                        style={{ backgroundColor: roleBadge.bg, color: roleBadge.text }}
                      >
                        {roleBadge.label}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium tracking-widest uppercase px-2 py-1 border border-[#e5e5e5] text-[#6b7280]">
                        {m.role ?? '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {teamBadge ? (
                      <span
                        className="text-[10px] font-medium tracking-widest uppercase px-2 py-1"
                        style={{ backgroundColor: teamBadge.bg, color: teamBadge.text }}
                      >
                        {teamBadge.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#6b7280]">{m.team ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#6b7280] whitespace-nowrap">
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('it-IT') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {composeOpen && (
        <ComposeModal
          recipients={selectedMembers}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  )
}
