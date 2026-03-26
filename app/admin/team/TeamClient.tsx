'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { TeamMember } from './page'

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
      <label className="block text-xs text-[#6b7280] mb-1">Photo</label>
      <div className="flex gap-2 items-center">
        <input
          value={currentUrl}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
          placeholder="https://… or upload below"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-xs font-medium px-3 py-2 transition-colors duration-150 disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
      {currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentUrl} alt="preview" className="mt-2 h-14 w-14 rounded-full object-cover object-top border border-[#e5e5e5]" />
      )}
    </div>
  )
}

// ── Add member form ────────────────────────────────────────────────────────────

function AddMemberForm({ type, onAdded }: { type: 'bod' | 'management'; onAdded: (m: TeamMember) => void }) {
  const [open, setOpen] = useState(false)
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
      })
      .select('id, name, role, photo_url, linkedin_url, type, order_index, created_at')
      .single()
    if (err || !data) {
      setError(err?.message ?? 'Error adding member')
      setSaving(false)
      return
    }
    onAdded(data as TeamMember)
    setName('')
    setRole('')
    setPhotoUrl('')
    setLinkedinUrl('')
    setOpen(false)
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Member
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-black/10 p-6 space-y-4">
      <p className="text-sm font-medium text-[#0a0a0a]">New member</p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#6b7280] mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm"
            placeholder="John Doe"
          />
        </div>
        <div>
          <label className="block text-xs text-[#6b7280] mb-1">Role *</label>
          <input
            required
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm"
            placeholder="President"
          />
        </div>
        <div className="col-span-2">
          <PhotoInput currentUrl={photoUrl} onChange={setPhotoUrl} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-[#6b7280] mb-1">LinkedIn URL</label>
          <input
            value={linkedinUrl}
            onChange={e => setLinkedinUrl(e.target.value)}
            className="w-full px-3 py-2.5 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm"
            placeholder="https://linkedin.com/in/…"
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50"
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[#6b7280] hover:text-[#0a0a0a] transition-colors"
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
  onUpdated,
  onDeleted,
  dragHandlers,
}: {
  member: TeamMember
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
      })
      .eq('id', member.id)
    if (err) {
      setError(err.message)
    } else {
      onUpdated({ ...member, name: name.trim(), role: role.trim(), photo_url: photoUrl.trim() || null, linkedin_url: linkedinUrl.trim() || null })
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
      className="bg-white border border-black/10"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {dragHandlers && (
          <div className="cursor-grab active:cursor-grabbing text-[#9ca3af] hover:text-[#1a4a3a] transition-colors flex-shrink-0">
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
          <div className="w-8 h-8 rounded-full bg-[#1a4a3a] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-medium">{member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#0a0a0a] truncate">{member.name}</p>
          <p className="text-xs text-[#6b7280] truncate">{member.role}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 text-xs text-[#1a4a3a] border border-[#1a4a3a] px-3 py-1.5 hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150"
        >
          {expanded ? 'Close' : 'Edit'}
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 text-xs text-red-500 border border-red-300 px-3 py-1.5 hover:bg-red-500 hover:text-white transition-colors duration-150 disabled:opacity-40"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>

      {/* Edit form */}
      {expanded && (
        <form onSubmit={handleUpdate} className="border-t border-black/5 px-4 py-4 space-y-3 bg-[#fafafa]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1">Role</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
              />
            </div>
            <div className="col-span-2">
              <PhotoInput currentUrl={photoUrl} onChange={setPhotoUrl} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-[#6b7280] mb-1">LinkedIn URL</label>
              <input
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
                placeholder="https://linkedin.com/in/…"
              />
            </div>
          </div>
          {error && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-5 py-2 transition-colors duration-150 disabled:opacity-50"
            >
              {saving ? '…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>}
          </div>
        </form>
      )}
    </div>
  )
}

// ── Members section with drag-and-drop ────────────────────────────────────────

function MembersSection({ title, type, initialMembers }: { title: string; type: 'bod' | 'management'; initialMembers: TeamMember[] }) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const membersRef = useRef<TeamMember[]>(members)
  membersRef.current = members

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
            <h2 className="font-serif text-2xl font-bold text-[#0a0a0a] group-hover:text-[#1a4a3a] transition-colors">
              {title}
              <span className="ml-2 text-base font-normal text-[#9ca3af]">({members.length})</span>
            </h2>
            <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
          </div>
          <svg
            className="w-4 h-4 text-[#9ca3af] transition-transform duration-200 flex-shrink-0 mt-1"
            style={{ transform: listOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {savingOrder && <span className="text-xs text-[#6b7280]">Saving order…</span>}
        {orderSaved && <span className="text-xs text-[#1a4a3a] font-medium">Order saved</span>}
      </div>

      {/* Collapsible body */}
      <div style={{ display: 'grid', gridTemplateRows: listOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          {/* Search */}
          <div className="relative mb-4 mt-2">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or role…"
              className="w-full pl-9 pr-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm bg-white"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-[#6b7280] mb-6">
              {search.trim() ? 'No results.' : 'No members yet.'}
            </p>
          ) : (
            <div className="space-y-px mb-6">
              {filtered.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  onUpdated={handleUpdated}
                  onDeleted={handleDeleted}
                  dragHandlers={search.trim() ? undefined : dragHandlers}
                />
              ))}
            </div>
          )}

          <AddMemberForm type={type} onAdded={handleAdded} />
          <div className="pb-1" />
        </div>
      </div>
    </section>
  )
}

// ── Root client ────────────────────────────────────────────────────────────────

export default function TeamClient({ members }: { members: TeamMember[] }) {
  const bod = members.filter(m => m.type === 'bod')
  const management = members.filter(m => m.type === 'management')

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">
      <MembersSection title="Board of Directors" type="bod" initialMembers={bod} />
      <MembersSection title="Management" type="management" initialMembers={management} />
    </div>
  )
}
