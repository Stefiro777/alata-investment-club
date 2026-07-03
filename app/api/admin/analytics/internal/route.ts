import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

type TransactionRow = {
  id: string
  type: 'revenue' | 'cost' | 'rimborso'
  amount: number
  category_id: string | null
}

// Financial aggregates for the Sponsors tab of /admin/analytics.
async function sponsorsSection() {
  const { data } = await supabaseAdmin
    .from('transactions')
    .select('id, type, amount, date, description, budget_categories!inner(name)')
    .ilike('budget_categories.name', '%sponsor%')
    .order('date', { ascending: false })
  const transactions = (data ?? []).map(t => ({
    id: t.id,
    type: t.type as 'revenue' | 'cost' | 'rimborso',
    amount: t.amount as number,
    date: (t.date as string | null) ?? null,
    description: (t.description as string | null) ?? null,
  }))
  const revenue = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const costs   = transactions.filter(t => t.type === 'cost').reduce((s, t) => s + t.amount, 0)
  return NextResponse.json({ transactions, revenue, costs })
}

// Financial aggregates for the Finance tab of /admin/analytics.
async function financeSection() {
  const [txRes, catRes, ordersRes] = await Promise.all([
    supabaseAdmin.from('transactions').select('id, type, amount, category_id'),
    supabaseAdmin.from('budget_categories').select('id, name'),
    supabaseAdmin.from('merch_orders')
      .select('id, product_name, variant_color, size, quantity, price_cents, customer_name, customer_email, status, created_at')
      .eq('status', 'paid')
      .order('created_at', { ascending: false }),
  ])
  const transactions = (txRes.data ?? []) as TransactionRow[]
  const categories   = (catRes.data ?? []) as { id: string; name: string }[]
  const merchOrders  = ordersRes.data ?? []

  const income   = transactions.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter(t => t.type === 'cost').reduce((s, t) => s + t.amount, 0)
  const refunds  = transactions.filter(t => t.type === 'rimborso').reduce((s, t) => s + t.amount, 0)
  const balance  = income - expenses + refunds

  const catMap: Record<string, { name: string; amount: number }> = {}
  for (const tx of transactions) {
    const key  = tx.category_id ?? '__none__'
    const name = categories.find(c => c.id === tx.category_id)?.name ?? 'Uncategorised'
    if (!catMap[key]) catMap[key] = { name, amount: 0 }
    if (tx.type === 'revenue' || tx.type === 'rimborso') catMap[key].amount += tx.amount
    if (tx.type === 'cost') catMap[key].amount -= tx.amount
  }
  const byCategory = Object.values(catMap).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))

  return NextResponse.json({
    income,
    expenses,
    balance,
    byCategory,
    hasTransactions: transactions.length > 0,
    merchOrders,
  })
}

export async function GET(req: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const section = req.nextUrl.searchParams.get('section')
  if (section === 'sponsors') return sponsorsSection()
  if (section === 'finance')  return financeSection()

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
