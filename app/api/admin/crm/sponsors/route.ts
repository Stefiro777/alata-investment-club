import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

// Requires these columns on the `partners` table (add via migration if missing):
//   agreement_start text | null
//   agreement_end   text | null
//   agreement_value numeric | null
//   agreement_description text | null
//
// Requires a `sponsor_people` table:
//   id uuid primary key default gen_random_uuid()
//   partner_id uuid references partners(id) on delete cascade
//   name text not null
//   role text | null
//   email text | null
//   phone text | null
//   notes text | null
//   created_at timestamptz default now()

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shared privileged-access check (bod/director)
const requireAdmin = requirePrivilegedAccess

// GET — fetch all partners with their people contacts
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: partners, error } = await supabaseAdmin
    .from('partners')
    .select('id, name, logo_url, website_url, description, type, order_index, click_count, created_at, agreement_start, agreement_end, agreement_value, agreement_description')
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: people } = await supabaseAdmin
    .from('sponsor_people')
    .select('id, partner_id, name, role, email, phone, notes, created_at')
    .order('created_at', { ascending: true })

  const peopleByPartner: Record<string, typeof people> = {}
  for (const p of people ?? []) {
    if (!peopleByPartner[p.partner_id]) peopleByPartner[p.partner_id] = []
    peopleByPartner[p.partner_id]!.push(p)
  }

  const result = (partners ?? []).map(p => ({
    ...p,
    people: peopleByPartner[p.id] ?? [],
  }))

  return NextResponse.json({ partners: result })
}

// POST — create a new partner/sponsor
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { data, error } = await supabaseAdmin
    .from('partners')
    .insert({
      name: body.name,
      logo_url: body.logo_url ?? null,
      website_url: body.website_url ?? null,
      description: body.description ?? null,
      type: body.type ?? 'sponsor',
      order_index: body.order_index ?? null,
      agreement_start: body.agreement_start ?? null,
      agreement_end: body.agreement_end ?? null,
      agreement_value: body.agreement_value ?? null,
      agreement_description: body.agreement_description ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data })
}

// PATCH — update an existing partner/sponsor by id
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const allowed = ['name', 'logo_url', 'website_url', 'description', 'type', 'order_index',
    'agreement_start', 'agreement_end', 'agreement_value', 'agreement_description']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key]
  }

  const { data, error } = await supabaseAdmin
    .from('partners')
    .update(update)
    .eq('id', id as string)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ partner: data })
}

// DELETE — delete a partner/sponsor by id
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin.from('partners').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
