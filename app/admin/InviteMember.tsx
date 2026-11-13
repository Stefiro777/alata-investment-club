'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pill, Section, SectionHeading, SegmentedPills } from '@/app/components/member/ui'
import { fieldCls, labelCls, errorCls } from '@/components/admin/crm/ui'
import { LAB_SUBDIVISIONS } from '@/lib/invite'
import { inviteArchiveGroups, inviteClosedAt, inviteStatus, isPendingInvite } from '@/lib/invite-status'

export type InviteItem = {
  id: string
  email: string
  team: string
  lab_subdivision: string | null
  created_at: string
  used_at?: string | null
  /** Set when the invitation was cancelled (needs the invites SQL; absent before it). */
  revoked_at?: string | null
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
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const textAction = 'rd-italic text-[20px] hover:underline underline-offset-[0.18em] disabled:opacity-40'
const dangerAction = `${textAction} text-[#8a2a1d]`

async function post(url: string, payload: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const text = await res.text()
  let json: { error?: string } = {}
  try { json = JSON.parse(text) } catch { json = { error: text } }
  return res.ok ? null : json.error ?? 'Something went wrong.'
}

/** Sends an invitation through the existing flow (/api/invite → email → /accept-invite). */
const sendInvite = (payload: { email: string; team: string; lab_subdivision?: string | null }) =>
  post('/api/invite', payload).then(err => err ?? null)

/**
 * Board > Overview: invite a person by email, the invitations still waiting (resend or cancel),
 * and the archive of those accepted or cancelled, by quarter. Renders sections, so the page
 * can place them side by side.
 */
export default function InviteMember({ invites }: { invites: InviteItem[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [team, setTeam] = useState<Team | null>(null)
  const [sub, setSub] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null)
  const [openedByReader, setOpenedByReader] = useState<Set<string> | null>(null)

  const pending = invites.filter(isPendingInvite)
  const archive = inviteArchiveGroups(invites)
  const archived = archive.reduce((n, g) => n + g.invites.length, 0)
  // The latest quarter is open until the reader chooses.
  const openQuarters = openedByReader ?? new Set(archive.slice(0, 1).map(g => g.key))
  function toggleQuarter(key: string) {
    setOpenedByReader(() => {
      const next = new Set(openQuarters)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

  async function resend(inv: InviteItem) {
    setResending(inv.id)
    setMessage(null)
    const err = await sendInvite({ email: inv.email, team: inv.team, lab_subdivision: inv.lab_subdivision })
    setResending(null)
    setMessage(err ? { text: err, bad: true } : { text: `Invitation sent again to ${inv.email}.`, bad: false })
    if (!err) router.refresh()
  }

  /** The row stays in the database: it moves to the archive as cancelled and its link stops working. */
  async function cancelInvite(inv: InviteItem) {
    setCancelling(inv.id)
    setMessage(null)
    const err = await post('/api/invite/cancel', { id: inv.id })
    setCancelling(null)
    setConfirmCancel(null)
    setMessage(err ? { text: err, bad: true } : { text: `The invitation to ${inv.email} was cancelled.`, bad: false })
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

      <div>
        <Section title="Pending invitations" meta={pending.length}>
          {pending.length === 0 ? (
            <p className="py-4 text-[13px] text-earth-600">No invitation is waiting.</p>
          ) : (
            <div className="border-t border-night/20">
              {pending.map(inv => (
                <div key={inv.id} className="border-b border-night/20 py-3.5">
                  <div className="font-serif text-[22px] font-medium leading-[1.1]">{inv.email}</div>
                  <div className="mt-[3px] text-[12px] leading-[1.5] text-earth-600">
                    {[teamLabel(inv.team), subLabel(inv.lab_subdivision), `sent ${day(inv.created_at)}`].filter(Boolean).join(' · ')}
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-5 gap-y-1">
                    <button type="button" onClick={() => resend(inv)} disabled={resending !== null || cancelling !== null} className={textAction}>
                      {resending === inv.id ? 'Sending…' : 'Resend'}
                    </button>
                    {confirmCancel === inv.id ? (
                      <span className="flex flex-wrap items-baseline gap-x-4">
                        <span className="text-[12px]">Cancel this invitation? Its link will stop working.</span>
                        <button type="button" onClick={() => cancelInvite(inv)} disabled={cancelling === inv.id} className={dangerAction}>
                          {cancelling === inv.id ? 'Cancelling…' : 'Yes, cancel'}
                        </button>
                        <button type="button" onClick={() => setConfirmCancel(null)} className={textAction}>No</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => { setMessage(null); setConfirmCancel(inv.id) }} className={dangerAction}>Cancel invite</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {message && (
            <p role={message.bad ? 'alert' : 'status'} className={message.bad ? `${errorCls} mt-3` : 'mt-3 text-[13px]'}>{message.text}</p>
          )}
        </Section>

        {archive.length > 0 && (
          <section>
            <SectionHeading title="Archived invitations" meta={`${archived} closed`} />
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
                      <span className="rd-eyebrow ml-3 text-[10px] text-earth-500">{g.invites.length}</span>
                    </span>
                    <span className="rd-italic text-[20px]">{isOpen ? 'Hide' : 'Show'}</span>
                  </button>
                  {isOpen && g.invites.map(inv => (
                    <div key={inv.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-night/20 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-serif text-[20px] font-medium leading-[1.15]">{inv.email}</div>
                        <div className="mt-0.5 text-[12px] text-earth-600">
                          {[teamLabel(inv.team), subLabel(inv.lab_subdivision), `${inviteStatus(inv) === 'accepted' ? 'accepted' : 'cancelled'} ${day(inviteClosedAt(inv))}`].filter(Boolean).join(' · ')}
                        </div>
                      </div>
                      <Pill size="sm" solid={inviteStatus(inv) === 'accepted'}>{inviteStatus(inv) === 'accepted' ? 'Accepted' : 'Cancelled'}</Pill>
                    </div>
                  ))}
                </div>
              )
            })}
          </section>
        )}
      </div>
    </>
  )
}
