'use client'

import { useEffect, useMemo, useState } from 'react'
import { FieldRow, Pill, SectionHeading, SegmentedPills, Tabs } from '@/app/components/member/ui'
import { archiveGroups, isClosed, outcomeDate } from '@/lib/application-archive'
import { LAB_SUBDIVISIONS } from '@/lib/invite'

type Application = {
  id: number
  nome: string
  cognome: string
  email: string
  telephone_number: string | null
  degree_programme: string | null
  anno_di_studio: string | null
  motivazione: string | null
  team: string | null
  created_at: string
  track?: 'analyst' | 'member' | null
  study_level?: string | null
  first_choice?: string | null
  second_choice?: string | null
  linkedin_url?: string | null
  status?: 'new' | 'seen' | 'accepted' | 'declined' | null
  /** When the outcome was saved (accepted / declined); the archive groups by its quarter. */
  reviewed_at?: string | null
  has_cv: boolean
}

type Filter = 'all' | 'analyst' | 'member'
const TEAM: Record<string, string> = { lab: 'Lab', media: 'Media', events: 'Events', member: 'Member' }

/** Before SQL A the track and choices travel inside the motivation. */
function derive(a: Application) {
  const text = a.motivazione ?? ''
  const fromText = (k: string) => text.match(new RegExp(`\\n${k}: (.+)`))?.[1]?.trim() ?? null
  const track = a.track ?? (a.team === 'member' || /Track: Member/.test(text) ? 'member' : 'analyst')
  const motivation = text.split('\n\nTrack:')[0]
  return {
    track,
    first: a.first_choice ?? (a.team !== 'member' ? a.team : null),
    second: a.second_choice ?? fromText('Second choice'),
    linkedin: a.linkedin_url ?? fromText('LinkedIn'),
    motivation,
  }
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })

export default function ApplicationsClient() {
  const [apps, setApps] = useState<Application[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Lab invitations need a subdivision, chosen here before sending.
  const [labSub, setLabSub] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/applications')
      .then(r => r.json())
      .then(j => setApps((j.data ?? []) as Application[]))
      .catch(() => setApps([]))
  }, [])

  const byTrack = useMemo(() => (apps ?? []).filter(a => {
    const d = derive(a)
    if (filter === 'analyst') return d.track === 'analyst'
    if (filter === 'member') return d.track === 'member'
    return true
  }), [apps, filter])
  // On top what is still to handle; accepted and declined go to the archive, by quarter.
  const list = useMemo(() => byTrack.filter(a => !isClosed(a)), [byTrack])
  const archive = useMemo(() => archiveGroups(byTrack), [byTrack])
  // The latest quarter is open until the reader chooses.
  const [openedByReader, setOpenedByReader] = useState<Set<string> | null>(null)
  const openQuarters = openedByReader ?? new Set(archive.slice(0, 1).map(g => g.key))
  function toggleQuarter(key: string) {
    setOpenedByReader(() => {
      const next = new Set(openQuarters)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const current = (apps ?? []).find(a => a.id === selected) ?? null

  async function setStatus(a: Application, status: 'seen' | 'accepted' | 'declined') {
    const res = await fetch('/api/admin/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, status }) })
    if (res.ok) setApps(prev => (prev ?? []).map(x => x.id === a.id ? { ...x, status } : x))
    return res
  }

  function open(a: Application) {
    setSelected(a.id)
    setMessage(null)
    setLabSub(null)
    // Mark as read; before SQL A the status cannot be stored and this is a no-op.
    if (!a.status || a.status === 'new') setStatus(a, 'seen').catch(() => {})
  }

  async function openCv(a: Application) {
    const res = await fetch(`/api/admin/applications?cv=${a.id}`)
    const j = await res.json().catch(() => ({}))
    if (j.url) window.open(j.url, '_blank', 'noopener')
    else setMessage(j.error ?? 'CV not available.')
  }

  /** Accept and invite: the existing invite flow (account → annual fee → card). */
  async function acceptAndInvite(a: Application) {
    const d = derive(a)
    const team = d.track === 'member' ? 'member' : d.first
    if (!team || !['events', 'media', 'lab', 'member'].includes(team)) { setMessage('No team to invite to.'); return }
    if (team === 'lab' && !labSub) { setMessage('Choose a Lab subdivision first.'); return }
    if (!confirm(`Send the invitation to ${a.email} (${TEAM[team]})?`)) return
    setBusy(true)
    setMessage(null)
    const res = await fetch('/api/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: a.email, team, lab_subdivision: team === 'lab' ? labSub : null }) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setMessage(j.error ?? 'Invitation failed.'); setBusy(false); return }
    const s = await setStatus(a, 'accepted')
    setMessage(s.ok ? 'Invitation sent. The application is marked as accepted.' : 'Invitation sent. (The status is saved after SQL A.)')
    setBusy(false)
  }

  async function decline(a: Application) {
    if (!confirm(`Mark the application of ${a.nome} ${a.cognome} as declined? No email is sent.`)) return
    setBusy(true)
    const res = await setStatus(a, 'declined')
    const j = await res.json().catch(() => ({}))
    setMessage(res.ok ? 'Marked as declined.' : j.error ?? 'Could not save.')
    setBusy(false)
  }

  /** One line of the list; in the archive it shows the outcome date and the outcome. */
  function renderApplication(a: Application, archived: boolean) {
    const d = derive(a)
    return (
      <button
        key={a.id}
        type="button"
        onClick={() => open(a)}
        aria-pressed={selected === a.id}
        className={`grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3.5 text-left transition-colors hover:bg-night/[0.03] ${selected === a.id ? 'bg-night/[0.05]' : ''}`}
      >
        <span className="font-serif text-[22px] font-medium leading-none">{fmt(archived ? outcomeDate(a) : a.created_at)}</span>
        <span className="min-w-0">
          <span className="block font-serif text-[22px] font-medium leading-[1.1]">{a.nome} {a.cognome}</span>
          <span className="mt-1 block truncate text-[12px] text-earth-600">
            {[d.track === 'member' ? 'Member' : 'Analyst', a.degree_programme, d.first ? TEAM[d.first] : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <Pill solid={!archived && (!a.status || a.status === 'new')}>{archived ? (a.status === 'accepted' ? 'Accepted' : 'Declined') : a.status ?? 'new'}</Pill>
      </button>
    )
  }

  if (apps === null) return <p className="py-8 text-[13px] text-earth-600">Loading…</p>

  return (
    <>
      <Tabs
        tabs={[{ key: 'all', label: 'All' }, { key: 'analyst', label: 'Analysts' }, { key: 'member', label: 'Members' }]}
        value={filter}
        onChange={setFilter}
      />
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div>
          <SectionHeading flush title="To handle" meta={list.length} />
          <div className="border-t border-night/20">
            {list.length === 0
              ? <p className="py-6 text-[13px] text-earth-600">Nothing to handle.</p>
              : list.map(a => renderApplication(a, false))}
          </div>

          {archive.length > 0 && (
            <section>
              <SectionHeading title="Archive" meta={`${archive.reduce((n, g) => n + g.apps.length, 0)} closed`} />
              {archive.map(g => {
                const isOpen = openQuarters.has(g.key)
                return (
                  <div key={g.key} className="border-t border-night/20">
                    <button
                      type="button"
                      onClick={() => toggleQuarter(g.key)}
                      aria-expanded={isOpen}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-3.5 text-left transition-colors hover:bg-night/[0.03]"
                    >
                      <span className="font-serif text-[22px] font-medium leading-[1.1]">
                        {g.label}
                        <span className="rd-eyebrow ml-3 text-[10px] text-earth-500">{g.apps.length}</span>
                      </span>
                      <span className="rd-italic text-[20px]">{isOpen ? 'Hide' : 'Show'}</span>
                    </button>
                    {isOpen && g.apps.map(a => renderApplication(a, true))}
                  </div>
                )
              })}
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          {current ? (() => {
            const d = derive(current)
            return (
              <div className="border border-night/25 p-[22px]">
                <div className="rd-eyebrow text-[10px] text-earth-500">{d.track === 'member' ? 'Member request' : 'Analyst application'}</div>
                <h3 className="rd-display mt-2 text-[32px]">{current.nome} {current.cognome}</h3>
                <div className="mt-4">
                  <FieldRow label="Email" value={<a href={`mailto:${current.email}`} className="underline underline-offset-4">{current.email}</a>} />
                  <FieldRow label="Phone" value={current.telephone_number ?? '—'} />
                  <FieldRow label="Degree" value={current.degree_programme ?? '—'} />
                  <FieldRow label="Level" value={current.anno_di_studio ?? '—'} />
                  {d.track === 'analyst' && <FieldRow label="Choices" value={[d.first, d.second].filter(Boolean).map(t => TEAM[t!] ?? t).join(' then ') || '—'} />}
                  {d.linkedin && <FieldRow label="LinkedIn" value={<a href={d.linkedin} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Profile</a>} />}
                  <FieldRow label="CV" value={current.has_cv ? <button type="button" onClick={() => openCv(current)} className="underline underline-offset-4">Open the PDF</button> : 'Not attached'} />
                </div>
                <div className="rd-eyebrow mt-5 text-[10px] text-earth-500">Motivation</div>
                <p className="mt-2 whitespace-pre-line text-[14px] leading-[1.65]">{d.motivation || '—'}</p>
                {d.track === 'analyst' && d.first === 'lab' && current.status !== 'accepted' && (
                  <div className="mt-5">
                    <div className="rd-eyebrow mb-2 text-[10px] text-earth-500">Lab subdivision, needed to invite</div>
                    <SegmentedPills size="sm" label="Lab subdivision" options={LAB_SUBDIVISIONS.map(l => ({ value: l.value, label: l.label }))} value={labSub ?? ''} onChange={setLabSub} />
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-baseline gap-x-8 gap-y-3">
                  <button type="button" disabled={busy || current.status === 'accepted'} onClick={() => acceptAndInvite(current)} className="rd-italic text-[26px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-40">
                    Accept and invite
                  </button>
                  <button type="button" disabled={busy || current.status === 'declined'} onClick={() => decline(current)} className="text-[13px] text-earth-600 hover:text-night disabled:opacity-40">
                    Decline
                  </button>
                </div>
                {message && <p role="status" className="mt-4 text-[13px]">{message}</p>}
              </div>
            )
          })() : (
            <p className="border border-dashed border-night/25 p-6 text-[13px] text-earth-600">Choose an application to read it.</p>
          )}
        </div>
      </div>
    </>
  )
}
