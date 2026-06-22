import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.email === 'finullistefano@gmail.com') return user
  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director') return null
  return user
}

export async function GET() {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [
    { count: total_members },
    { data: allMembers },
    { count: total_registrations },
    { data: regsByEvent },
    { count: total_applications },
    { count: applications_this_month },
    { count: checked_in_total },
    { count: open_events },
  ] = await Promise.all([
    supabaseAdmin.from('club_members').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('club_members').select('teams'),
    supabaseAdmin.from('event_registrations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('event_registrations').select('event_id, upcoming_events(title)'),
    supabaseAdmin.from('applications').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('applications').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabaseAdmin.from('event_registrations').select('*', { count: 'exact', head: true }).eq('checked_in', true),
    supabaseAdmin.from('upcoming_events').select('*', { count: 'exact', head: true }).in('status', ['open', 'coming_soon']),
  ])

  // members_by_team: flatten teams arrays
  const teamCounts: Record<string, number> = {}
  for (const m of allMembers ?? []) {
    for (const t of (m.teams as string[] | null) ?? []) {
      teamCounts[t] = (teamCounts[t] ?? 0) + 1
    }
  }
  const members_by_team = Object.entries(teamCounts)
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count)

  // registrations_by_event
  const eventCounts: Record<string, number> = {}
  for (const r of regsByEvent ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const title = (r as any).upcoming_events?.title ?? 'Unknown'
    eventCounts[title] = (eventCounts[title] ?? 0) + 1
  }
  const registrations_by_event = Object.entries(eventCounts)
    .map(([event_title, count]) => ({ event_title, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    total_members: total_members ?? 0,
    members_by_team,
    total_registrations: total_registrations ?? 0,
    registrations_by_event,
    total_applications: total_applications ?? 0,
    applications_this_month: applications_this_month ?? 0,
    checked_in_total: checked_in_total ?? 0,
    open_events: open_events ?? 0,
  })
}
