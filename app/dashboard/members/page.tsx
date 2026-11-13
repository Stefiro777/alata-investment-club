'use client'

import { isHiddenTeam } from '@/lib/hidden-teams'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'
import { TEAM_BADGE } from '../teamColors'
import { Pill, Tabs, pillClass } from '@/app/components/member/ui'
import { ROLES, roleWarnings } from '@/lib/roles'

// ── Constants ─────────────────────────────────────────────────────────────────

const TEAM_OPTIONS = [
  { key: 'events',    label: 'Events' },
  { key: 'media',     label: 'Media' },
  { key: 'career',    label: 'Career' },
  { key: 'education', label: 'Education' },
  { key: 'academy',   label: 'Academy' },
  { key: 'syrto',     label: 'Syrto' },
  { key: 'lab',       label: 'Lab' },
  { key: 'alumni',    label: 'Alumni' },
]

// Hidden teams keep their label (existing members may still carry them) but
// can no longer be assigned or used as a filter.
const VISIBLE_TEAM_OPTIONS = TEAM_OPTIONS.filter(t => !isHiddenTeam(t.key))

const LAB_SUBDIVISIONS = [
  { key: 'macro_markets',    label: 'Macro & Markets' },
  { key: 'equity_valuation', label: 'Equity Valuation' },
  { key: 'ma',               label: 'M&A' },
]

const ROLE_OPTIONS = ROLES.map(r => ({ key: r.value, label: r.label }))

// The people list, one group per role.
const ROLE_GROUPS = [
  { key: 'bod',      label: 'Board of Directors' },
  { key: 'director', label: 'Management' },
  { key: 'lab',      label: 'Lab' },
  { key: 'media',    label: 'Media' },
  { key: 'events',   label: 'Events' },
  { key: 'career',   label: 'Career' },
  { key: 'alumni',   label: 'Alumni' },
  { key: 'member',   label: 'Members' },
]

function roleGroupLabel(role: string): string {
  return ROLE_GROUPS.find(r => r.key === role)?.label ?? role
}

function lastName(name: string): string {
  return name.trim().split(' ').slice(-1)[0].toLowerCase()
}

function teamLabel(key: string): string {
  return TEAM_OPTIONS.find(t => t.key === key)?.label ?? key
}

function labSubLabel(key: string): string {
  return LAB_SUBDIVISIONS.find(l => l.key === key)?.label ?? key
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Member = {
  id: string
  user_id?: string | null
  full_name: string
  email: string | null
  phone: string | null
  role: string
  title: string | null
  teams: string[] | null
  lab_subdivision: string | null
  photo_url?: string | null
  linkedin_url?: string | null
}

type Alumnus = {
  id: string
  name: string
  role: string | null
  current_company: string | null
  company: string | null
  linkedin_url: string | null
  photo_url: string | null
}

type FormState = {
  full_name: string
  email: string
  phone: string
  role: string
  title: string
  teams: string[]
  lab_subdivision: string
  user_id?: string | null
}

const EMPTY_FORM: FormState = {
  full_name: '',
  email: '',
  phone: '',
  role: 'member',
  title: '',
  teams: [],
  lab_subdivision: '',
  user_id: null,
}

// ── MemberForm modal ──────────────────────────────────────────────────────────

function MemberFormModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: (Member & { isNew: boolean }) | null
  onClose: () => void
  onSaved: (member: Member, isNew: boolean) => void
}) {
  const isNew = initial?.isNew ?? true
  const [form, setForm] = useState<FormState>(() =>
    initial && !initial.isNew
      ? {
          full_name: initial.full_name,
          email: initial.email ?? '',
          phone: initial.phone ?? '',
          role: initial.role,
          title: initial.title ?? '',
          teams: initial.teams ?? [],
          lab_subdivision: initial.lab_subdivision ?? '',
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [pendingSaved, setPendingSaved] = useState<{ member: Member; isNew: boolean } | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleTeam(key: string) {
    setForm(f => {
      const next = f.teams.includes(key)
        ? f.teams.filter(t => t !== key)
        : [...f.teams, key]
      // clear lab_subdivision if lab deselected
      return { ...f, teams: next, lab_subdivision: next.includes('lab') ? f.lab_subdivision : '' }
    })
  }

  /** The role is changed by the API, which checks who may do it; the rest was saved above. */
  async function finish(member: Member, isNewMember: boolean) {
    const before = isNewMember ? 'member' : initial!.role
    if (form.role !== before) {
      const res = await fetch('/api/admin/crm/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, role: form.role }),
      }).catch(() => null)
      const json = res ? await res.json().catch(() => ({})) : {}
      if (!res || !res.ok) {
        setPendingSaved({ member, isNew: isNewMember })
        setError(`Saved, but the role was not changed: ${json.error ?? 'network error'}`)
        setSaving(false)
        return
      }
      member = { ...member, role: form.role }
    }
    onSaved(member, isNewMember)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) return
    setSaving(true)
    setError(null)

    const payload = {
      full_name:       form.full_name.trim(),
      email:           form.email.trim() || null,
      phone:           form.phone.trim() || null,
      title:           form.title.trim() || null,
      teams:           form.teams.length ? form.teams : null,
      lab_subdivision: form.teams.includes('lab') && form.lab_subdivision ? form.lab_subdivision : null,
    }

    const supabase = createClient()
    if (isNew) {
      const { data, error: err } = await supabase
        .from('club_members')
        .insert({ ...payload, role: 'member' }) // the role goes through the API below
        .select('id, user_id, full_name, email, phone, role, title, teams, lab_subdivision, photo_url, linkedin_url')
        .maybeSingle()
      if (err || !data) { setError(err?.message ?? 'Errore'); setSaving(false); return }
      await finish(data as Member, true)
    } else {
      const { data, error: err } = await supabase
        .from('club_members')
        .update(payload)
        .eq('id', initial!.id)
        .select('id, user_id, full_name, email, phone, role, title, teams, lab_subdivision')
        .maybeSingle()
      if (err || !data) { setError(err?.message ?? 'Errore'); setSaving(false); return }
      await finish(data as Member, false)
    }
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">
            {isNew ? 'Aggiungi membro' : 'Modifica membro'}
          </h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-7 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Nome completo *</label>
            <input
              required
              value={form.full_name}
              onChange={e => setField('full_name', e.target.value)}
              placeholder="Nome Cognome"
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          {/* Email + Phone — stacked below sm: so long emails aren't cramped into ~136px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="nome@esempio.com"
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Telefono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setField('phone', e.target.value)}
                placeholder="+39 000 000 0000"
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          {/* Role + Title — same cramped-field issue as Email/Phone above, same fix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Ruolo</label>
              <div className="relative">
                <select
                  value={form.role}
                  onChange={e => setField('role', e.target.value)}
                  className="border border-forest bg-white text-black font-['Inter'] text-sm w-full px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest appearance-none"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option
                      key={r.key}
                      value={r.key}
                      className={r.key === form.role ? 'bg-forest text-white' : 'bg-white text-black'}
                    >
                      {r.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Titolo</label>
              <input
                value={form.title}
                onChange={e => setField('title', e.target.value)}
                placeholder="es. Head of Events"
                className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
              />
            </div>
          </div>

          {/* Teams */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-2">
              Team ({form.teams.length} selezionati)
            </label>
            <div className="grid grid-cols-2 gap-1 border border-line p-3">
              {VISIBLE_TEAM_OPTIONS.map(t => (
                <label key={t.key} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.teams.includes(t.key)}
                    onChange={() => toggleTeam(t.key)}
                    className="accent-forest w-3.5 h-3.5 flex-shrink-0"
                  />
                  <span className="text-sm text-ink-900">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {roleWarnings(form.role, form.teams, form.lab_subdivision).map(w => (
            <p key={w} className="text-xs leading-[1.5] text-ink-500">{w}</p>
          ))}

          {/* Lab subdivision — only when lab is selected */}
          {form.teams.includes('lab') && (
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Divisione Lab</label>
              <div className="relative">
                <select
                  value={form.lab_subdivision}
                  onChange={e => setField('lab_subdivision', e.target.value)}
                  className="border border-forest px-3 py-2 text-sm font-['Inter'] focus:outline-none bg-white text-black w-full appearance-none"
                >
                  <option value="">Nessuna</option>
                  {LAB_SUBDIVISIONS.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a4a3a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          {pendingSaved && (
            <button type="button" onClick={() => onSaved(pendingSaved.member, pendingSaved.isNew)} className="text-sm text-ink-900 underline underline-offset-4">Done</button>
          )}

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              disabled={saving || !form.full_name.trim() || !!pendingSaved}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40"
            >
              {saving ? 'Salvataggio…' : isNew ? 'Aggiungi' : 'Salva'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function Portrait({ src, name }: { src?: string | null; name: string }) {
  const initials = name.split(/s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-[57px] w-[44px] shrink-0 overflow-hidden bg-[#e8e1d2]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="rd-eyebrow flex h-full items-center justify-center text-[11px] text-earth-500">{initials}</span>
      )}
    </div>
  )
}

/** Board APed: photo, name in Cormorant, a dot in the team colour with title and team, LinkedIn in italics. */
function MemberRow({
  member,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  member: Member
  canEdit: boolean
  canDelete: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]     = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('club_members').delete().eq('id', member.id)
    if (!error) onDelete()
    else setDeleting(false)
  }

  const teams = member.teams ?? []
  const dot = TEAM_BADGE[member.role === 'bod' ? 'bod' : teams[0] ?? '']?.bg ?? '#1a4a3a'
  const meta = [member.title, ...teams.map(teamLabel), member.lab_subdivision ? labSubLabel(member.lab_subdivision) : null].filter(Boolean).join(' · ')

  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3.5">
      <Portrait src={member.photo_url} name={member.full_name} />
      <div className="min-w-0">
        <div className="rd-display truncate text-[22px] leading-[1.15]">{member.full_name}</div>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-earth-700">
          <i className="block h-[8px] w-[8px] shrink-0 rounded-full" style={{ backgroundColor: dot }} />
          <span className="truncate">{meta || roleGroupLabel(member.role)}</span>
        </div>
        {(member.email || member.phone) && (
          <div className="mt-0.5 flex flex-wrap gap-x-4 text-[12px] text-earth-600">
            {member.email && <a href={`mailto:${member.email}`} className="hover:underline">{member.email}</a>}
            {member.phone && <a href={`tel:${member.phone}`} className="hover:underline">{member.phone}</a>}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-4">
        {member.linkedin_url && (
          <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="rd-italic text-[20px] hover:underline underline-offset-[0.18em]">LinkedIn</a>
        )}
        {confirmDel ? (
          <span className="flex items-baseline gap-3 text-[12px]">
            <span className="text-earth-600">Delete?</span>
            <button onClick={handleDelete} disabled={deleting} className="font-semibold text-red-600 hover:text-red-800 disabled:opacity-40">{deleting ? '…' : 'Yes'}</button>
            <button onClick={() => setConfirmDel(false)} className="text-earth-600 hover:text-night">No</button>
          </span>
        ) : (
          <>
            {canEdit && <button onClick={onEdit} className="rd-italic text-[18px] text-earth-600 hover:text-night hover:underline underline-offset-[0.18em]">Edit</button>}
            {canDelete && <button onClick={() => setConfirmDel(true)} className="rd-italic text-[18px] text-earth-600 hover:text-red-600 hover:underline underline-offset-[0.18em]">Delete</button>}
          </>
        )}
      </div>
    </li>
  )
}

function AlumnusRow({ a }: { a: Alumnus }) {
  const meta = [a.role, a.current_company || a.company].filter(Boolean).join(' · ')
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3.5">
      <Portrait src={a.photo_url} name={a.name} />
      <div className="min-w-0">
        <div className="rd-display truncate text-[22px] leading-[1.15]">{a.name}</div>
        {meta && <div className="mt-1 truncate text-[12px] text-earth-700">{meta}</div>}
      </div>
      {a.linkedin_url && (
        <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" className="rd-italic text-[20px] hover:underline underline-offset-[0.18em]">LinkedIn</a>
      )}
    </li>
  )
}

// ── FilterDropdown ────────────────────────────────────────────────────────────

function FilterDropdown({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { key: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.key === value) ?? options[0]

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`${pillClass({ active: value !== options[0].key })} focus:outline-none`}
      >
        <span>{selected.label}</span>
        <svg
          className="w-4 h-4 text-forest flex-shrink-0 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 min-w-full bg-ivory border border-night/20 shadow-md">
          {options.map(o => (
            <button
              key={o.key}
              type="button"
              onMouseDown={() => { onChange(o.key); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm border-b border-[#e5e7eb] last:border-b-0 ${
                o.key === value
                  ? 'bg-club text-ivory'
                  : 'text-night hover:bg-night/5'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const profile = useProfile()

  const [members, setMembers]               = useState<Member[]>([])
  const [alumni, setAlumni]                 = useState<Alumnus[]>([])
  const [tab, setTab]                       = useState<'members' | 'alumni'>('members')
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [teamFilter, setTeamFilter]         = useState('all')
  const [roleFilter, setRoleFilter]         = useState('all')
  const [modal, setModal]                   = useState<(Member & { isNew: boolean }) | null>(null)

  const isBoD      = profile?.role === 'bod' || profile?.role === 'director'
  const isDirector = profile?.role === 'director'
  const canAdd     = isBoD

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const [{ data: memberData }, { data: alumniData }] = await Promise.all([
        supabase
          .from('club_members')
          .select('id, user_id, full_name, email, phone, role, title, teams, lab_subdivision')
          .order('role', { ascending: true })
          .order('full_name', { ascending: true }),
        supabase
          .from('alumni')
          .select('id, name, role, current_company, company, linkedin_url, photo_url')
          .order('order_index', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true }),
      ])

      setMembers((memberData ?? []) as Member[])
      setAlumni((alumniData ?? []) as Alumnus[])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter(m => {
      if (q && !m.full_name.toLowerCase().includes(q) && !(m.teams ?? []).some(t => teamLabel(t).toLowerCase().includes(q))) return false
      if (teamFilter !== 'all' && !(m.teams ?? []).includes(teamFilter)) return false
      if (roleFilter !== 'all' && m.role !== roleFilter) return false
      return true
    })
  }, [members, search, teamFilter, roleFilter])

  const filteredAlumni = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return alumni
    return alumni.filter(a => [a.name, a.role, a.current_company, a.company].some(v => v?.toLowerCase().includes(q)))
  }, [alumni, search])

  const grouped = useMemo(() => {
    return ROLE_GROUPS.map(g => ({
      ...g,
      members: filtered
        .filter(m => m.role === g.key)
        .sort((a, b) => lastName(a.full_name).localeCompare(lastName(b.full_name), 'it')),
    })).filter(g => g.members.length > 0)
  }, [filtered])

  function canEditMember(): boolean {
    return isBoD || isDirector
  }

  function handleSaved(saved: Member, isNew: boolean) {
    setMembers(prev =>
      isNew
        ? [...prev, saved]
        : prev.map(m => m.id === saved.id ? saved : m)
    )
    setModal(null)
  }

  function handleDeleted(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-sm text-ink-500">Caricamento...</div>
    )
  }

  return (
    <div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="rd-display text-[clamp(40px,4.6vw,54px)]">People</h1>
          <p className="mt-3 text-[14px] text-earth-600">The club, and the people who came before.</p>
        </div>
        {canAdd && (
          <div className="shrink-0 self-start">
            <Pill solid onClick={() => setModal({ ...EMPTY_FORM, id: '', user_id: null, full_name: '', email: null, phone: null, role: 'member', title: null, teams: null, lab_subdivision: null, isNew: true })}>Add member</Pill>
          </div>
        )}
      </div>

      {/* Pills switch the list on small screens; from lg up both lists sit side by side. */}
      <div className="mt-6 lg:hidden">
        <Tabs tabs={[{ key: 'members', label: 'Members' }, { key: 'alumni', label: 'Alumni' }]} value={tab} onChange={setTab} />
      </div>

      {/* Search and filters */}
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-night pb-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or team"
          aria-label="Search people"
          className="min-w-[200px] flex-1 bg-transparent text-[14px] placeholder:text-earth-600 focus:outline-none"
        />
        <div className={tab === 'members' ? 'flex gap-2' : 'hidden gap-2 lg:flex'}>
          <FilterDropdown value={teamFilter} onChange={setTeamFilter} options={[{ key: 'all', label: 'All teams' }, ...VISIBLE_TEAM_OPTIONS]} />
          <FilterDropdown value={roleFilter} onChange={setRoleFilter} options={[{ key: 'all', label: 'All roles' }, ...ROLE_OPTIONS]} />
        </div>
      </div>

      <div className="mt-10 grid gap-x-12 gap-y-12 lg:grid-cols-2">
        <section className={tab === 'members' ? '' : 'hidden lg:block'} aria-label="Members">
          <div className="flex items-baseline justify-between border-b border-night pb-3">
            <h2 className="rd-italic text-[clamp(28px,3vw,34px)]">Members</h2>
            <span className="rd-eyebrow text-[10px] text-earth-500">{filtered.length} {filtered.length === 1 ? 'member' : 'members'}</span>
          </div>
          {filtered.length === 0 ? (
            <p className="py-6 text-[13px] text-earth-600">No member found.</p>
          ) : (
            <ul>
              {grouped.flatMap(g => g.members).map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  canEdit={canEditMember()}
                  canDelete={isBoD}
                  onEdit={() => setModal({ ...m, isNew: false })}
                  onDelete={() => handleDeleted(m.id)}
                />
              ))}
            </ul>
          )}
        </section>

        <section className={tab === 'alumni' ? '' : 'hidden lg:block'} aria-label="Alumni network">
          <div className="flex items-baseline justify-between border-b border-night pb-3">
            <h2 className="rd-italic text-[clamp(28px,3vw,34px)]">Alumni network</h2>
            <span className="rd-eyebrow text-[10px] text-earth-500">{filteredAlumni.length} alumni</span>
          </div>
          {filteredAlumni.length === 0 ? (
            <p className="py-6 text-[13px] text-earth-600">No alumni found.</p>
          ) : (
            <ul>{filteredAlumni.map(a => <AlumnusRow key={a.id} a={a} />)}</ul>
          )}
          <a href="/team/alumni" className="rd-italic mt-5 inline-block text-[22px] hover:underline underline-offset-[0.18em]">See all alumni</a>
        </section>
      </div>

      {/* Form modal */}
      {modal && (
        <MemberFormModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}


    </div>
  )
}
