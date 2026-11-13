'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { FieldRow, Pill, SegmentedPills } from '@/app/components/member/ui'
import Portrait from '@/app/components/member/Portrait'
import { ROLES, isAnalyst, roleLabel, roleWarnings, type Role } from '@/lib/roles'
import { EVENT_YEARS, formatStudyYear, studyKeyOf } from '@/lib/event-years'
import {
  Numbers, Toolbar, SearchField, SelectField, Split, CrmTable, CrmRow, NameCell, Sheet, SheetEmpty, Dialog, Tag,
  cell, fmtDate, revealSheet, fieldCls, labelCls, btnPrimary, btnGhost, errorCls, type Column,
} from './crm/ui'

type Member = {
  id: string
  full_name: string
  email: string
  role: string
  teams: string[] | null
  lab_subdivision?: string | null
  title: string | null
  created_at: string
  study_level?: string | null
  study_year?: number | null
  membership_removed_at?: string | null
  photo_url?: string | null
}

type Kind = 'all' | 'analyst' | 'member' | 'other'

/**
 * Analyst = Lab, Media or Events; Member = plain member; everyone else (BoD, Management,
 * Career, Alumni) is shown by their role. Same rule as lib/roles.ts.
 */
const kindOf = (m: Pick<Member, 'role' | 'teams'>): Exclude<Kind, 'all'> =>
  isAnalyst(m.role, m.teams) ? 'analyst' : m.role === 'member' ? 'member' : 'other'

const yearOf = (m: Member) => formatStudyYear(m.study_level, m.study_year)

const teamLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

const COLUMNS: Column[] = [
  { label: '' },
  { label: 'Name' },
  { label: 'Role', wide: true },
  { label: 'Year', wide: true },
  { label: 'Team' },
  { label: 'Joined', wide: true, align: 'right' },
]
const TEMPLATE = 'grid-cols-[20px_minmax(0,1fr)_84px] sm:grid-cols-[20px_minmax(0,1fr)_104px_88px_96px_84px]'

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

  return (
    <Dialog
      title="Send email"
      sub={`${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
      onClose={onClose}
      busy={status === 'sending'}
    >
      {status === 'done' && result ? (
        <div className="space-y-5 py-4 text-center">
          <p className="text-[13px]">Sent: {result.sent} · Failed: {result.failed}</p>
          <button type="button" onClick={onClose} className={btnGhost}>Close</button>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-[12px] leading-[1.6] text-earth-700">
            {visibleRecipients.map(m => m.full_name).join(', ')}
            {overflow > 0 && ` and ${overflow} others`}
          </p>

          <label className="block">
            <span className={labelCls}>Subject</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} disabled={status === 'sending'} className={fieldCls} />
          </label>

          <label className="block">
            <span className={labelCls}>Message</span>
            <textarea
              rows={6}
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={status === 'sending'}
              placeholder="Write your message here…"
              className={`${fieldCls} resize-none`}
            />
            <span className="mt-1 block text-[11px] text-earth-500">[Nome] will be replaced with each member&apos;s name.</span>
          </label>

          {status === 'error' && errorMsg && <p className={errorCls}>{errorMsg}</p>}

          <div className="flex justify-end gap-2 border-t border-night/20 pt-4">
            <button type="button" onClick={onClose} disabled={status === 'sending'} className={btnGhost}>Cancel</button>
            <button
              type="button"
              onClick={handleSend}
              disabled={status === 'sending' || !subject.trim() || !message.trim()}
              className={btnPrimary}
            >
              {status === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MembersTable() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [kindFilter, setKindFilter] = useState<Kind>('all')
  const [yearFilter, setYearFilter] = useState('')
  const [showRemoved, setShowRemoved] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [composeOpen, setComposeOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [roleBusy, setRoleBusy] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/admin/crm/members${showRemoved ? '?removed=1' : ''}`)
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
  }, [showRemoved])

  const teams = useMemo(() => {
    const set = new Set<string>()
    members.forEach(m => (m.teams ?? []).forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [members])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return members.filter(m => {
      const teamsStr = (m.teams ?? []).join(' ').toLowerCase()
      const matchSearch = !q ||
        m.full_name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        teamsStr.includes(q)
      const matchTeam = !teamFilter || (m.teams ?? []).includes(teamFilter)
      const matchKind = kindFilter === 'all' || kindOf(m) === kindFilter
      const key = studyKeyOf(m.study_level, m.study_year)
      const matchYear = !yearFilter || (yearFilter === 'none' ? key === null : key === yearFilter)
      return matchSearch && matchTeam && matchKind && matchYear
    })
  }, [members, search, teamFilter, kindFilter, yearFilter])

  const active = members.filter(m => !m.membership_removed_at)
  const analystCount = active.filter(m => kindOf(m) === 'analyst').length
  const memberCount = active.filter(m => kindOf(m) === 'member').length
  const noYearCount = active.filter(m => studyKeyOf(m.study_level, m.study_year) === null).length

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

  /** The role goes through the API, which checks who may change it; teams are never touched. */
  async function changeRole(m: Member, role: Role) {
    if (role === m.role) return
    setRoleBusy(true)
    setRoleError(null)
    try {
      const res = await fetch('/api/admin/crm/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, role }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setRoleError(json.error ?? 'Could not change the role.')
      else setMembers(prev => prev.map(x => (x.id === m.id ? { ...x, role } : x)))
    } catch {
      setRoleError('Network error. Try again.')
    }
    setRoleBusy(false)
  }

  function open(id: string) {
    setOpenId(id)
    setCopied(false)
    setRoleError(null)
    revealSheet(sheetRef.current)
  }

  async function copyEmail(email: string) {
    await navigator.clipboard.writeText(email)
    setCopied(true)
  }

  const selectedMembers = members.filter(m => selected.has(m.id))
  const current = members.find(m => m.id === openId) ?? null

  if (loading) return <p className="py-10 text-center text-[13px] text-earth-600">Loading…</p>
  if (error) return <p className={errorCls}>{error}</p>

  return (
    <div>
      <Numbers items={[
        { value: active.length, label: 'Active members' },
        { value: analystCount, label: 'Analysts' },
        { value: memberCount, label: 'Members' },
        { value: noYearCount, label: 'Without a year' },
      ]} />

      <Toolbar
        actions={
          <>
            <button type="button" onClick={() => setComposeOpen(true)} disabled={selected.size === 0} className={btnPrimary}>
              Send email{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </>
        }
      >
        <SearchField value={search} onChange={setSearch} placeholder="Name, email, team…" />
        <SelectField label="Team" value={teamFilter} onChange={setTeamFilter} width="sm:w-[180px]">
          <option value="">All teams</option>
          {teams.map(t => <option key={t} value={t}>{teamLabel(t)}</option>)}
        </SelectField>
        <SelectField label="Year" value={yearFilter} onChange={setYearFilter} width="sm:w-[160px]">
          <option value="">All years</option>
          {EVENT_YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
          <option value="none">No year</option>
        </SelectField>
        <div>
          <span className={`${labelCls} mb-2`}>Kind</span>
          <SegmentedPills
            size="sm"
            label="Kind"
            options={[{ value: 'all', label: 'All' }, { value: 'analyst', label: 'Analysts' }, { value: 'member', label: 'Members' }, { value: 'other', label: 'Others' }]}
            value={kindFilter}
            onChange={setKindFilter}
          />
        </div>
        <div>
          <span className={`${labelCls} mb-2`}>Removed</span>
          <Pill size="sm" active={showRemoved} onClick={() => setShowRemoved(v => !v)}>{showRemoved ? 'Shown' : 'Hidden'}</Pill>
        </div>
      </Toolbar>

      <Split
        sheetRef={sheetRef}
        list={
          <CrmTable
            title="Members"
            meta={filtered.length === members.length ? members.length : `${filtered.length} of ${members.length}`}
            columns={[{ label: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={filtered.length === 0} aria-label="Select all shown" className="h-3.5 w-3.5 cursor-pointer accent-[#1a4a3a]" /> }, ...COLUMNS.slice(1)]}
            template={TEMPLATE}
            isEmpty={filtered.length === 0}
            empty="No members found."
          >
            {filtered.map(m => {
              const memberTeams = m.teams ?? []
              return (
                <CrmRow
                  key={m.id}
                  template={TEMPLATE}
                  selected={m.id === openId}
                  onOpen={() => open(m.id)}
                  label={`Open ${m.full_name}`}
                  lead={
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleRow(m.id)}
                      aria-label={`Select ${m.full_name}`}
                      className="h-3.5 w-3.5 cursor-pointer accent-[#1a4a3a]"
                    />
                  }
                >
                  <span className={cell(COLUMNS[1])}>
                    <span className="flex min-w-0 items-center gap-3">
                      <Portrait src={m.photo_url} name={m.full_name} size="sm" />
                      <NameCell name={m.full_name} sub={m.email} tag={m.membership_removed_at ? <Tag>Removed</Tag> : undefined} />
                    </span>
                  </span>
                  <span className={cell(COLUMNS[2])}>
                    <Tag title={kindOf(m) === 'analyst' ? 'Works in Lab, Media or Events' : undefined}>
                      {kindOf(m) === 'analyst' ? `Analyst · ${roleLabel(m.role) === 'Member' ? teamLabel((m.teams ?? []).find(t => ['lab', 'media', 'events'].includes(t)) ?? '') : roleLabel(m.role)}` : roleLabel(m.role)}
                    </Tag>
                  </span>
                  <span className={cell(COLUMNS[3], 'text-[12px] text-earth-700')}>{yearOf(m) ?? '—'}</span>
                  <span className={cell(COLUMNS[4], 'text-[12px] text-earth-700')}>
                    {memberTeams.length === 0 ? '—' : memberTeams.map(teamLabel).join(', ')}
                  </span>
                  <span className={cell(COLUMNS[5], 'rd-num text-[12px] text-earth-700')}>
                    {m.created_at ? new Date(m.created_at).toLocaleDateString('it-IT') : '—'}
                  </span>
                </CrmRow>
              )
            })}
          </CrmTable>
        }
        sheet={
          current ? (
            <Sheet
              title="Member"
              meta={roleLabel(current.role)}
              actions={
                <>
                  <button type="button" onClick={() => toggleRow(current.id)} className={selected.has(current.id) ? btnPrimary : btnGhost}>
                    {selected.has(current.id) ? 'Selected for email' : 'Select for email'}
                  </button>
                  <button type="button" onClick={() => copyEmail(current.email)} className={btnGhost}>
                    {copied ? 'Email copied' : 'Copy email'}
                  </button>
                </>
              }
            >
              <div className="border-b border-night/20 py-4">
                <Portrait src={current.photo_url} name={current.full_name} size="lg" />
              </div>
              <FieldRow label="Name" value={current.full_name} />
              <FieldRow label="Email" value={<a href={`mailto:${current.email}`} className="hover:underline">{current.email}</a>} />
              <div className="border-b border-night/20 py-[11px]">
                <div className="rd-eyebrow mb-2 text-[10px] text-earth-500">Role</div>
                <SegmentedPills
                  size="sm"
                  label="Role"
                  disabled={roleBusy}
                  options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                  value={current.role as Role}
                  onChange={v => changeRole(current, v)}
                />
                {roleError && <p role="alert" className={`${errorCls} mt-3`}>{roleError}</p>}
                {roleWarnings(current.role, current.teams, current.lab_subdivision).map(w => (
                  <p key={w} role="status" className="mt-3 text-[12px] leading-[1.5] text-earth-700">{w}</p>
                ))}
              </div>
              <FieldRow label="Year" value={yearOf(current) ?? '—'} muted={!yearOf(current)} />
              <FieldRow label="Team" value={(current.teams ?? []).length ? (current.teams ?? []).map(teamLabel).join(', ') : '—'} muted={!(current.teams ?? []).length} />
              <FieldRow label="Title" value={current.title || '—'} muted={!current.title} />
              <FieldRow label="Joined" value={fmtDate(current.created_at)} />
            </Sheet>
          ) : (
            <SheetEmpty title="Member" text="Open a member from the list. Tick the boxes to write to several at once." />
          )
        }
      />

      {composeOpen && (
        <ComposeModal
          recipients={selectedMembers}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </div>
  )
}
