'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import MembershipCard from '@/components/dashboard/MembershipCard'
import { useProfile } from '../DashboardProfileContext'
import { PageTitle, Section, FieldRow, ProgressRule } from '@/app/components/member/ui'

type EditKey = 'phone' | 'degree_programme' | 'year' | 'linkedin_url'

/** Board APrd: the digital membership card, then the profile details. */
export default function ProfilePage() {
  const profile = useProfile()!
  const router = useRouter()
  const [editing, setEditing] = useState<EditKey | null>(null)
  const [draft, setDraft] = useState('')
  const [level, setLevel] = useState<'bachelor' | 'master'>((profile.study_level as 'bachelor' | 'master') ?? 'bachelor')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  const memberSince = profile.created_at ? String(new Date(profile.created_at).getFullYear()) : null
  const year = profile.study_level
    ? `${profile.study_level === 'master' ? 'Master' : 'Bachelor'}${profile.study_year ? `, year ${profile.study_year}` : ''}`
    : null

  const rows: { key: EditKey | 'name' | 'email' | 'photo'; label: string; value: string | null; editable: boolean }[] = [
    { key: 'name', label: 'Name', value: profile.full_name, editable: false },
    { key: 'email', label: 'Email', value: profile.email, editable: false },
    { key: 'phone', label: 'Phone', value: profile.phone ?? null, editable: true },
    { key: 'degree_programme', label: 'Degree', value: profile.degree_programme ?? null, editable: true },
    { key: 'year', label: 'Year', value: year, editable: true },
    { key: 'photo', label: 'Photo', value: profile.photo_url ? 'Added' : null, editable: true },
    { key: 'linkedin_url', label: 'LinkedIn', value: profile.linkedin_url?.replace(/^https?:\/\/(www\.)?/, '') ?? null, editable: true },
  ]
  const filled = rows.filter(r => r.value).length

  async function save(body: Record<string, unknown>) {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Could not save.'); return }
    setEditing(null)
    window.location.reload()
  }

  async function uploadPhoto(file: File) {
    setSaving(true)
    setError(null)
    const fd = new FormData()
    fd.append('photo', file)
    const res = await fetch('/api/me/profile', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Upload failed.'); return }
    window.location.reload()
  }

  function start(key: EditKey, current: string | null) {
    setError(null)
    setEditing(key)
    setDraft(key === 'year' ? String(profile.study_year ?? '') : current && key === 'linkedin_url' ? (profile.linkedin_url ?? '') : current ?? '')
  }

  async function logout() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <PageTitle title={<>Your <em>profile</em></>} sub="Filled in from your application. Correct anything that is not right." />

      <div className="mt-9 grid gap-12 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
        <div>
          <h2 className="rd-italic mb-4 text-[28px]">Membership card</h2>
          <MembershipCard
            name={profile.full_name}
            role={profile.role}
            memberId={profile.member_id ?? null}
            memberSince={memberSince}
            expiresAt={profile.membership_expires_at ?? null}
          />
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
            <Link href="/dashboard/membership" className="rd-italic text-[24px] text-club hover:underline underline-offset-[0.18em]">Renew</Link>
            {profile.member_id && (
              <Link href={`/verify/${profile.member_id}`} target="_blank" className="rd-italic text-[24px] hover:underline underline-offset-[0.18em]">Show the check page</Link>
            )}
          </div>
        </div>

        <div>
          <Section title="Details" meta={`${filled} of 7`} after={<ProgressRule value={filled / 7} />}>
            {rows.map(r => {
              if (editing && r.key === editing) {
                return (
                  <form
                    key={r.key}
                    onSubmit={e => {
                      e.preventDefault()
                      if (editing === 'year') save({ study_level: level, study_year: draft ? Number(draft) : null })
                      else save({ [editing]: draft })
                    }}
                    className="grid grid-cols-[84px_minmax(0,1fr)] items-center gap-3 border-b border-night/20 py-2 sm:grid-cols-[120px_minmax(0,1fr)_auto]"
                  >
                    <span className="rd-eyebrow text-[10px] text-earth-500">{r.label}</span>
                    {editing === 'year' ? (
                      <div className="flex items-center gap-3">
                        <select value={level} onChange={e => setLevel(e.target.value as 'bachelor' | 'master')} className="rd-field mt-0 w-auto py-1 text-[18px]">
                          <option value="bachelor">Bachelor</option>
                          <option value="master">Master</option>
                        </select>
                        <input type="number" min={1} max={6} value={draft} onChange={e => setDraft(e.target.value)} aria-label="Year" placeholder="Year" className="rd-field mt-0 w-20 py-1 text-[18px]" />
                      </div>
                    ) : (
                      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} type={editing === 'phone' ? 'tel' : 'text'} className="rd-field mt-0 py-1 text-[18px]" />
                    )}
                    <span className="col-span-2 flex gap-4 sm:col-span-1">
                      <button type="submit" disabled={saving} className="rd-italic text-[20px] text-club disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                      <button type="button" onClick={() => setEditing(null)} className="text-[12px] text-earth-500">Cancel</button>
                    </span>
                  </form>
                )
              }
              return (
                <FieldRow
                  key={r.key}
                  label={r.label}
                  value={r.value ?? 'Not added'}
                  muted={!r.value}
                  aside={!r.editable ? null : r.key === 'photo' ? (
                    <button type="button" onClick={() => photoRef.current?.click()} className="rd-italic text-[20px] hover:underline">{r.value ? 'Change' : 'Add'}</button>
                  ) : (
                    <button type="button" onClick={() => start(r.key as EditKey, r.value)} className="rd-italic text-[20px] hover:underline">{r.value ? 'Edit' : 'Add'}</button>
                  )}
                />
              )
            })}
          </Section>
          <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
          {error && <p role="alert" className="mt-4 text-[13px] text-[#8a2a1d]">{error}</p>}
          <button type="button" onClick={logout} className="mt-10 text-[13px] text-earth-600 hover:text-night">Log out</button>
        </div>
      </div>
    </>
  )
}
