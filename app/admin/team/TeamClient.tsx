'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { TeamMember } from './page'
import Portrait from '@/app/components/member/Portrait'
import { suggestLinks } from '@/lib/team-member-match'

// ── Photo upload helper ────────────────────────────────────────────────────────

async function uploadPhoto(file: File): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/\s+/g, '_')}`
  const { data, error } = await supabase.storage
    .from('team-photos')
    .upload(path, file, { upsert: false })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from('team-photos').getPublicUrl(data.path)
  return { url: publicUrl }
}

// ── Photo input ────────────────────────────────────────────────────────────────

function PhotoInput({
  currentUrl,
  onChange,
}: {
  currentUrl: string
  onChange: (url: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const result = await uploadPhoto(file)
    if ('error' in result) {
      setUploadError(result.error)
    } else {
      onChange(result.url)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label className="block text-xs text-ink-500 mb-1">Photo</label>
      <div className="flex gap-2 items-center">
        <input
          value={currentUrl}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
          placeholder="https://… or upload below"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-fast disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="preview" className="mt-2 h-14 w-14 rounded-full object-cover object-top border border-line" />
      )}
    </div>
  )
}

// ── Linked member (the club member behind a row of /team) ──────────────────────

/** A club member that a row of the public team page can be linked to. */
export type LinkableMember = {
  id: string
  full_name: string
  role: string | null
  title: string | null
  email: string | null
  photo_url: string | null
  membership_removed_at: string | null
}

const SELECT_FIELDS = 'id, name, role, photo_url, linkedin_url, type, order_index, created_at'
const selectFields = (linkable: boolean) => (linkable ? `${SELECT_FIELDS}, member_id` : SELECT_FIELDS)

/**
 * Which club member this person is, and a button that copies their profile photo into the
 * photo field above. Nothing is automatic: /team shows only what is saved in the photo field.
 */
function LinkedMemberField({
  value,
  onChange,
  linkable,
  onUsePhoto,
}: {
  value: string
  onChange: (id: string) => void
  linkable: LinkableMember[]
  onUsePhoto: (url: string) => void
}) {
  const linked = linkable.find(m => m.id === value) ?? null
  const options = linkable.filter(m => !m.membership_removed_at || m.id === value)

  return (
    <div>
      <label className="block text-xs text-ink-500 mb-1">Linked member</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
      >
        <option value="">None</option>
        {options.map(m => (
          <option key={m.id} value={m.id}>{[m.full_name, m.title].filter(Boolean).join(' · ')}</option>
        ))}
      </select>
      {linked && (
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          <Portrait src={linked.photo_url} name={linked.full_name} size="sm" />
          <button
            type="button"
            disabled={!linked.photo_url}
            onClick={() => linked.photo_url && onUsePhoto(linked.photo_url)}
            className="rd-italic text-[20px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-40 disabled:no-underline"
          >
            Use profile photo
          </button>
          <span className="text-xs text-ink-500">
            {linked.photo_url ? 'Copies it into the Photo field above; save to publish it on /team.' : 'This member has not uploaded a profile photo.'}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Suggested links: confirm who is who, nothing is written before ─────────────

type PendingLink = { teamId: string; member: LinkableMember }

function SuggestedLinks({
  members,
  linkable,
  onLinked,
}: {
  members: TeamMember[]
  linkable: LinkableMember[]
  onLinked: (teamId: string, memberId: string) => void
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [recap, setRecap] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions = suggestLinks(
    members.map(m => ({ id: m.id, name: m.name, member_id: m.member_id ?? null })),
    linkable,
  ).filter(s => !dismissed.has(s.teamId))
  const rowOf = (teamId: string) => members.find(m => m.id === teamId)
  const exact = suggestions.filter(s => s.kind === 'exact')

  async function save(pairs: PendingLink[], key: string) {
    setBusy(key)
    setError(null)
    const supabase = createClient()
    const results = await Promise.all(pairs.map(p => supabase.from('team_members').update({ member_id: p.member.id }).eq('id', p.teamId)))
    const failed = results.find(r => r.error)
    pairs.forEach((p, i) => { if (!results[i].error) onLinked(p.teamId, p.member.id) })
    if (failed?.error) setError(failed.error.message)
    setBusy(null)
    setRecap(false)
  }

  if (suggestions.length === 0 && !error) return null

  return (
    <div className="mb-8 border-y border-night/20 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h3 className="rd-italic text-[26px]">Suggested links</h3>
        {exact.length > 0 && !recap && (
          <button type="button" onClick={() => setRecap(true)} className="rd-italic text-[20px] text-club hover:underline underline-offset-[0.18em]">
            Confirm exact matches ({exact.length})
          </button>
        )}
      </div>
      <p className="mt-1 max-w-[620px] text-xs leading-[1.6] text-ink-500">
        People of this page that look like a club member. Check each pair, then confirm it. The link is only for the Board:
        what /team shows is still the Photo field of each person.
      </p>

      {recap && (
        <div className="mt-4 border border-night/25 p-4">
          <p className="text-sm font-medium text-ink-900">Link these {exact.length} people? Same name, one member each.</p>
          <ul className="mt-3 divide-y divide-night/10 text-sm">
            {exact.map(s => (
              <li key={s.teamId} className="flex flex-wrap items-baseline justify-between gap-x-4 py-1.5">
                <span>{rowOf(s.teamId)?.name}</span>
                <span className="text-ink-500">{s.member.full_name} · {s.member.email}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline gap-6">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => save(exact.map(s => ({ teamId: s.teamId, member: s.member })), 'all')}
              className="rd-italic text-[22px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50"
            >
              {busy === 'all' ? 'Linking…' : `Yes, link these ${exact.length}`}
            </button>
            <button type="button" onClick={() => setRecap(false)} className="rd-italic text-[20px] hover:underline underline-offset-[0.18em]">Cancel</button>
          </div>
        </div>
      )}

      <ul className="mt-3">
        {suggestions.map(s => {
          const row = rowOf(s.teamId)
          if (!row) return null
          return (
            <li key={s.teamId} className="grid grid-cols-1 items-center gap-x-6 gap-y-3 border-t border-night/15 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <Portrait src={row.photo_url} name={row.name} size="sm" />
                <div className="min-w-0">
                  <div className="truncate font-serif text-[20px] font-medium leading-[1.15]">{row.name}</div>
                  <div className="truncate text-xs text-ink-500">On /team: {row.role}</div>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <Portrait src={s.member.photo_url} name={s.member.full_name} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate font-serif text-[20px] font-medium leading-[1.15]">{s.member.full_name}</span>
                    <span className="shrink-0 rounded-full border border-night/40 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                      {s.kind === 'exact' ? 'Exact name' : 'Probable'}
                    </span>
                  </div>
                  <div className="truncate text-xs text-ink-500">{[s.member.title ?? 'No title', s.member.email].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
              <div className="flex items-baseline gap-5">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => save([{ teamId: s.teamId, member: s.member }], s.teamId)}
                  className="rd-italic text-[20px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50"
                >
                  {busy === s.teamId ? 'Linking…' : 'Confirm'}
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(prev => new Set(prev).add(s.teamId))}
                  className="rd-italic text-[20px] hover:underline underline-offset-[0.18em]"
                >
                  Not this person
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="mt-3 border-l-2 border-red-400 pl-3 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Add member form ────────────────────────────────────────────────────────────

function AddMemberForm({ type, linkable, onAdded }: { type: 'bod' | 'management'; linkable?: LinkableMember[]; onAdded: (m: TeamMember) => void }) {
  const [open, setOpen] = useState(false)
  const [memberId, setMemberId] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !role.trim()) return
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('team_members')
      .insert({
        name: name.trim(),
        role: role.trim(),
        photo_url: photoUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        type,
        // Sent only when the link column exists (linkable is passed) and one was chosen.
        ...(linkable && memberId ? { member_id: memberId } : {}),
      })
      .select(selectFields(!!linkable))
      .single()
    if (err || !data) {
      setError(err?.message ?? 'Error adding member')
      setSaving(false)
      return
    }
    onAdded(data as unknown as TeamMember)
    setName('')
    setRole('')
    setPhotoUrl('')
    setLinkedinUrl('')
    setMemberId('')
    setOpen(false)
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Member
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-line-faint p-6 space-y-4">
      <p className="text-sm font-medium text-ink-900">New member</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-ink-500 mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-xs text-ink-500 mb-1">Role *</label>
          <input
            required
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm"
            placeholder="President"
          />
        </div>
        {linkable && (
          <div className="sm:col-span-2">
            <LinkedMemberField value={memberId} onChange={setMemberId} linkable={linkable} onUsePhoto={setPhotoUrl} />
          </div>
        )}
        <div className="sm:col-span-2">
          <PhotoInput currentUrl={photoUrl} onChange={setPhotoUrl} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-ink-500 mb-1">LinkedIn URL</label>
          <input
            value={linkedinUrl}
            onChange={e => setLinkedinUrl(e.target.value)}
            className="w-full px-3 py-2.5 border border-line focus:outline-none focus:border-forest text-sm"
            placeholder="https://linkedin.com/in/…"
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50"
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-ink-500 hover:text-ink-900 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Member row ─────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  linkable,
  onUpdated,
  onDeleted,
  dragHandlers,
}: {
  member: TeamMember
  linkable?: LinkableMember[]
  onUpdated: (m: TeamMember) => void
  onDeleted: (id: string) => void
  dragHandlers?: {
    onDragStart: (e: React.DragEvent, id: string) => void
    onDragOver: (e: React.DragEvent, id: string) => void
    onDrop: (e: React.DragEvent) => void
  }
}) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(member.name)
  const [role, setRole] = useState(member.role)
  const [photoUrl, setPhotoUrl] = useState(member.photo_url ?? '')
  const [linkedinUrl, setLinkedinUrl] = useState(member.linkedin_url ?? '')
  const [memberId, setMemberId] = useState(member.member_id ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('team_members')
      .update({
        name: name.trim(),
        role: role.trim(),
        photo_url: photoUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        // The link column exists only when linkable is passed.
        ...(linkable ? { member_id: memberId || null } : {}),
      })
      .eq('id', member.id)
    if (err) {
      setError(err.message)
    } else {
      onUpdated({ ...member, name: name.trim(), role: role.trim(), photo_url: photoUrl.trim() || null, linkedin_url: linkedinUrl.trim() || null, ...(linkable ? { member_id: memberId || null } : {}) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${member.name}"?`)) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('team_members').delete().eq('id', member.id)
    onDeleted(member.id)
  }

  return (
    <div
      draggable={!!dragHandlers}
      onDragStart={dragHandlers ? e => dragHandlers.onDragStart(e, member.id) : undefined}
      onDragOver={dragHandlers ? e => dragHandlers.onDragOver(e, member.id) : undefined}
      onDrop={dragHandlers ? e => dragHandlers.onDrop(e) : undefined}
      className="bg-white border border-line-faint"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {dragHandlers && (
          <div className="cursor-grab active:cursor-grabbing text-ink-400 hover:text-forest transition-colors flex-shrink-0">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
              <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
              <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
            </svg>
          </div>
        )}
        {member.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.photo_url} alt={member.name} className="w-8 h-8 rounded-full object-cover object-top flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-900 truncate">{member.name}</p>
          <p className="text-xs text-ink-500 truncate">{member.role}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-xs text-forest border border-forest px-3 py-3.5 hover:bg-forest hover:text-white transition-colors duration-fast"
        >
          {expanded ? 'Close' : 'Edit'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 text-xs text-red-500 border border-red-300 px-3 py-3.5 hover:bg-red-500 hover:text-white transition-colors duration-fast disabled:opacity-40"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>

      {/* Edit form */}
      {expanded && (
        <form onSubmit={handleUpdate} className="border-t border-black/5 px-4 py-4 space-y-3 bg-paper-cool">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-ink-500 mb-1">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-ink-500 mb-1">Role</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
              />
            </div>
            {linkable && (
              <div className="sm:col-span-2">
                <LinkedMemberField value={memberId} onChange={setMemberId} linkable={linkable} onUsePhoto={setPhotoUrl} />
              </div>
            )}
            <div className="sm:col-span-2">
              <PhotoInput currentUrl={photoUrl} onChange={setPhotoUrl} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-ink-500 mb-1">LinkedIn URL</label>
              <input
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                className="w-full px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
                placeholder="https://linkedin.com/in/…"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-fast disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-forest font-medium">Saved</span>}
          </div>
        </form>
      )}
    </div>
  )
}

// ── Members section with drag-and-drop ────────────────────────────────────────

function MembersSection({ title, type, initialMembers, linkable }: { title: string; type: 'bod' | 'management'; initialMembers: TeamMember[]; linkable?: LinkableMember[] }) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const membersRef = useRef<TeamMember[]>(members)
  // Keep the ref in step for the event handlers, outside of render.
  useEffect(() => { membersRef.current = members }, [members])

  const dragSrcRef = useRef<string | null>(null)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderSaved, setOrderSaved] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [search, setSearch] = useState('')

  function onDragStart(_e: React.DragEvent, id: string) {
    dragSrcRef.current = id
  }

  function onDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const srcId = dragSrcRef.current
    if (!srcId || srcId === targetId) return
    const list = membersRef.current
    const from = list.findIndex(m => m.id === srcId)
    const to = list.findIndex(m => m.id === targetId)
    if (from === -1 || to === -1) return
    const next = [...list]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setMembers(next)
  }

  async function onDrop(_e: React.DragEvent) {
    dragSrcRef.current = null
    const current = membersRef.current
    setSavingOrder(true)
    setOrderSaved(false)
    const supabase = createClient()
    const results = await Promise.all(
      current.map((m, i) =>
        supabase.from('team_members').update({ order_index: i }).eq('id', m.id)
      )
    )
    const failed = results.find(r => r.error)
    setSavingOrder(false)
    if (!failed) {
      setOrderSaved(true)
      setTimeout(() => setOrderSaved(false), 2500)
    }
  }

  function handleUpdated(updated: TeamMember) {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  function handleDeleted(id: string) {
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  function handleAdded(m: TeamMember) {
    setMembers(prev => [...prev, m])
  }

  const dragHandlers = { onDragStart, onDragOver, onDrop }

  const filtered = search.trim()
    ? members.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase())
      )
    : members

  return (
    <section>
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          onClick={() => setListOpen(v => !v)}
          className="flex items-center gap-3 group text-left"
        >
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink-900 group-hover:text-forest transition-colors">
              {title}
              <span className="ml-2 text-base font-normal text-ink-400">({members.length})</span>
            </h2>
            <div className="w-10 h-0.5 bg-forest mt-2" />
          </div>
          <svg
            className="w-4 h-4 text-ink-400 transition-transform duration-200 flex-shrink-0 mt-1"
            style={{ transform: listOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {savingOrder && <span className="text-xs text-ink-500">Saving order…</span>}
        {orderSaved && <span className="text-xs text-forest font-medium">Order saved</span>}
      </div>

      {linkable && (
        <SuggestedLinks
          members={members}
          linkable={linkable}
          onLinked={(teamId, memberId) => setMembers(prev => prev.map(m => (m.id === teamId ? { ...m, member_id: memberId } : m)))}
        />
      )}

      {/* Collapsible body */}
      <div style={{ display: 'grid', gridTemplateRows: listOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {/* Search */}
          <div className="relative mb-4 mt-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or role…"
              className="w-full pl-9 pr-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-ink-500 mb-6">
              {search.trim() ? 'No results.' : 'No members yet.'}
            </p>
          ) : (
            <div className="space-y-px mb-6">
              {filtered.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  linkable={linkable}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  dragHandlers={search.trim() ? undefined : dragHandlers}
                />
              ))}
            </div>
          )}

          <AddMemberForm type={type} linkable={linkable} onAdded={handleAdded} />
          <div className="pb-1" />
        </div>
      </div>
    </section>
  )
}

// ── Root client ────────────────────────────────────────────────────────────────

/**
 * `linkable` (the club members a row can be linked to) is passed only by the pages whose database
 * has team_members.member_id; without it the selector and the suggestions are not shown.
 */
export default function TeamClient({ members, linkable }: { members: TeamMember[]; linkable?: LinkableMember[] }) {
  const bod = members.filter(m => m.type === 'bod')

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">
      <MembersSection title="Board of Directors" type="bod" initialMembers={bod} linkable={linkable} />
    </div>
  )
}
