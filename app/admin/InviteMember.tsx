'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Row, Section, SegmentedPills } from '@/app/components/member/ui'
import { fieldCls, labelCls, errorCls } from '@/components/admin/crm/ui'
import { LAB_SUBDIVISIONS } from '@/lib/invite'

export type PendingInvite = {
  id: string
  email: string
  team: string
  lab_subdivision: string | null
  created_at: string
}

type Team = 'lab' | 'events' | 'media' | 'alumni'

const TEAM_OPTIONS: { value: Team; label: string }[] = [
  { value: 'lab', label: 'Lab' },
  { value: 'events', label: 'Events' },
  { value: 'media', label: 'Media' },
  { value: 'alumni', label: 'Alumni' },
]

const teamLabel = (t: string) => TEAM_OPTIONS.find(o => o.value === t)?.label ?? (t === 'member' ? 'Member' : t)
const subLabel = (s: string | null) => LAB_SUBDIVISIONS.find(l => l.value === s)?.label ?? null
const sentOn = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Sends an invitation through the existing flow (/api/invite → email → /accept-invite). */
async function sendInvite(payload: { email: string; team: string; lab_subdivision?: string | null }): Promise<string | null> {
  const res = await fetch('/api/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let json: { error?: string } = {}
  try { json = JSON.parse(text) } catch { json = { error: text } }
  return res.ok ? null : json.error ?? 'Could not send the invitation.'
}

/**
 * Board > Overview: invite a person by email, and the invitations still waiting.
 * Renders two sections (the form and the pending list) so the page can place them side by side.
 */
export default function InviteMember({ pending }: { pending: PendingInvite[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState<Team | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSent(null)
    const address = email.trim().toLowerCase()
    if (!address) return
    if (!team) { setError('Choose a team.'); return }
    if (team === 'lab' && !sub) { setError('Choose a Lab subdivision.'); return }
    setBusy(true)
    const err = await sendInvite({ email: address, team, lab_subdivision: team === 'lab' ? sub : null })
    setBusy(false)
    if (err) { setError(err); return }
    setSent(address)
    setEmail('')
    setTeam(null)
    setSub(null)
    router.refresh()
  }

  async function resend(inv: PendingInvite) {
    setResending(inv.id)
    setResendMsg(null)
    const err = await sendInvite({ email: inv.email, team: inv.team, lab_subdivision: inv.lab_subdivision })
    setResending(null)
    setResendMsg(err ?? `Invitation sent again to ${inv.email}.`)
    if (!err) router.refresh()
  }

  return (
    <>
      <Section id="invite" title="Invite member" meta="By email">
        <form onSubmit={submit} className="pt-4">
          <label className="block">
            <span className={labelCls}>Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); setSent(null) }}
              placeholder="name@email.com"
              className={fieldCls}
            />
          </label>

          <div className="mt-5">
            <div className={`${labelCls} mb-2`}>Team</div>
            <SegmentedPills
              size="sm"
              label="Team"
              options={TEAM_OPTIONS}
              value={(team ?? '') as Team}
              onChange={v => { setTeam(v); if (v !== 'lab') setSub(null) }}
            />
          </div>

          {team === 'lab' && (
            <div className="mt-5">
              <div className={`${labelCls} mb-2`}>Lab subdivision</div>
              <SegmentedPills
                size="sm"
                label="Lab subdivision"
                options={LAB_SUBDIVISIONS.map(l => ({ value: l.value, label: l.label }))}
                value={sub ?? ''}
                onChange={setSub}
              />
            </div>
          )}

          {error && <p role="alert" className={`${errorCls} mt-5`}>{error}</p>}
          {sent && <p role="status" className="mt-5 text-[13px]">Invitation sent to {sent}.</p>}

          <button
            type="submit"
            disabled={busy}
            className="rd-italic mt-6 text-[26px] text-club hover:underline underline-offset-[0.18em] disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send invite'}
          </button>
          <p className="mt-2 text-[12px] text-earth-600">The person gets a link to set a password and join the club.</p>
        </form>
      </Section>

      <Section title="Pending invitations" meta={pending.length}>
        {pending.length === 0 ? (
          <p className="py-4 text-[13px] text-earth-600">No invitation is waiting.</p>
        ) : pending.map(inv => (
          <Row
            key={inv.id}
            title={inv.email}
            detail={[teamLabel(inv.team), subLabel(inv.lab_subdivision), `sent ${sentOn(inv.created_at)}`].filter(Boolean).join(' · ')}
            action={resending === inv.id ? 'Sending…' : 'Resend'}
            onClick={resending ? undefined : () => resend(inv)}
          />
        ))}
        {resendMsg && <p role="status" className="mt-3 text-[13px]">{resendMsg}</p>}
      </Section>
    </>
  )
}
