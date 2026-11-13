import { createServiceClient } from '@/lib/supabase-server'
import { PageTitle, Section, Row, Pill } from '@/app/components/member/ui'
import OverviewSwitches from './OverviewSwitches'
import InviteMember, { type InviteItem } from './InviteMember'
import { isMissingColumn } from '@/lib/invite-status'
import FlagshipCreditsEditor from './FlagshipCreditsEditor'
import { CareerPriceSection, AboutMetricsSection } from './OverviewSettings'
import { ABOUT_STATS_KEY, parseAboutStats } from '@/lib/about-stats'
import { FLAGSHIP_CREDITS_KEY, parseFlagshipCredits } from '@/lib/flagship-credits'
import { SESSION_PRICE_KEY } from '@/lib/session-price'

export const dynamic = 'force-dynamic'

function quarterStart(d: Date) {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).toISOString().slice(0, 10)
}

const eur = (n: number) => `€${Math.round(n).toLocaleString('it-IT')}`

/** Board ABod: where the club stands today. Access is checked by the layout. */
export default async function BoardOverviewPage() {
  const db = createServiceClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString()
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString()

  const [members, expiring, nextEvents, revenue, applications, settings, costsNoReceipt, partners, invites, careerPrice, aboutStats, flagshipCredits] = await Promise.all([
    db.from('club_members').select('id', { count: 'exact', head: true }).is('membership_removed_at', null).gt('membership_expires_at', now.toISOString()),
    db.from('club_members').select('id', { count: 'exact', head: true }).is('membership_removed_at', null).gt('membership_expires_at', now.toISOString()).lt('membership_expires_at', in30),
    db.from('upcoming_events').select('id, title, status, date').gte('date', today).neq('status', 'completed').order('date', { ascending: true }).limit(1),
    db.from('transactions').select('amount').eq('type', 'revenue').gte('date', quarterStart(now)),
    db.from('applications').select('*').gte('created_at', since30).order('created_at', { ascending: false }),
    db.from('settings').select('value').eq('key', 'applications_open').maybeSingle(),
    db.from('transactions').select('id', { count: 'exact', head: true }).eq('type', 'cost').is('receipt_url', null),
    // partners.next_step arrives with SQL B; until then this query errors and the row is hidden.
    db.from('partners').select('id, next_step').not('next_step', 'is', null),
    // All the invitations: waiting, accepted and cancelled.
    db.from('invites').select('id, email, team, lab_subdivision, created_at, used_at, revoked_at').order('created_at', { ascending: false }),
    // Site settings, edited here.
    db.from('settings').select('value').eq('key', SESSION_PRICE_KEY).maybeSingle(),
    db.from('settings').select('value').eq('key', ABOUT_STATS_KEY).maybeSingle(),
    db.from('settings').select('value').eq('key', FLAGSHIP_CREDITS_KEY).maybeSingle(),
  ])
  // Every invitation: pending ones on top, accepted and cancelled ones in the archive.
  // Before the revoked_at SQL the column is missing: read without it (nothing is cancelled yet).
  let inviteRows = invites
  if (invites.error && isMissingColumn(invites.error)) {
    inviteRows = await db.from('invites').select('id, email, team, lab_subdivision, created_at, used_at').order('created_at', { ascending: false }) as typeof invites
  }
  const allInvites = (inviteRows.error ? [] : inviteRows.data ?? []) as InviteItem[]

  const next = nextEvents.data?.[0] ?? null
  const registered = next
    ? (await db.from('event_registrations').select('id', { count: 'exact', head: true }).eq('event_id', next.id)).count ?? 0
    : 0
  const revenueQ = (revenue.data ?? []).reduce((s, t) => s + Number(t.amount ?? 0), 0)
  const apps = (applications.data ?? []) as { status?: string }[]
  const newApps = apps.filter(a => !a.status || a.status === 'new').length
  const followUps = partners.error ? null : (partners.data ?? []).length

  const numbers = [
    { value: String(members.count ?? 0), label: 'Active members' },
    { value: String(registered), label: next ? 'Registered, next event' : 'No upcoming event' },
    { value: eur(revenueQ), label: 'Revenue, this quarter' },
    { value: String(apps.length), label: 'Applications, 30 days' },
  ]

  return (
    <>
      <PageTitle
        title="Overview"
        sub="Where the club stands today."
        action={
          <div className="flex flex-wrap gap-2">
            <Pill href="#invite" solid>Invite member</Pill>
            <Pill href="/admin/content">New event</Pill>
            <Pill href="/admin/finance">Add transaction</Pill>
          </div>
        }
      />

      <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-night pt-6 md:grid-cols-4">
        {numbers.map(n => (
          <div key={n.label}>
            <div className="font-serif text-[clamp(40px,4.5vw,56px)] font-medium leading-none">{n.value}</div>
            <div className="mt-2 text-[12px] text-earth-600">{n.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-x-12 lg:grid-cols-2">
        <Section title="Needs attention">
          <Row title="Applications" detail={`${newApps} to read in the last 30 days.`} href="/admin/applications" action="Review" lead={<span className="w-10 font-serif text-[30px] font-medium">{newApps}</span>} />
          <Row title="Memberships expiring" detail="In the next 30 days." href="/admin/membership" action="Open" lead={<span className="w-10 font-serif text-[30px] font-medium">{expiring.count ?? 0}</span>} />
          {followUps !== null && (
            <Row title="Sponsor follow-ups" detail="With a next step written down." href="/admin/crm" action="Open" lead={<span className="w-10 font-serif text-[30px] font-medium">{followUps}</span>} />
          )}
          <Row title="Accounting documents" detail="Costs without a receipt attached." href="/admin/finance" action="Add" lead={<span className="w-10 font-serif text-[30px] font-medium">{costsNoReceipt.count ?? 0}</span>} />
        </Section>

        <Section title="Switches">
          <OverviewSwitches
            applicationsOpen={settings.data?.value === 'true'}
            nextEvent={next ? { id: next.id, title: next.title, status: next.status ?? 'coming_soon' } : null}
          />
          <p className="mt-6 text-[12px] text-earth-500">Only the BoD and Management see the Board panel.</p>
        </Section>
      </div>

      <div className="grid gap-x-12 lg:grid-cols-2">
        <InviteMember invites={allInvites} />
      </div>

      <div className="grid gap-x-12 lg:grid-cols-2">
        <CareerPriceSection initialCents={careerPrice.data?.value ?? '3000'} />
        <AboutMetricsSection initial={parseAboutStats(aboutStats.data?.value)} />
        <FlagshipCreditsEditor initial={parseFlagshipCredits(flagshipCredits.data?.value)} />
      </div>
    </>
  )
}
