import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function requireAdmin(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (user.email === 'finullistefano@gmail.com') return user
  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role === 'bod' || member?.role === 'director') return user
  return null
}

// POST — add a person contact to a partner
export async function POST(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body.partner_id || !body.name) {
    return NextResponse.json({ error: 'Missing partner_id or name' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('sponsor_people')
    .insert({
      partner_id: body.partner_id,
      name: body.name,
      role: body.role ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
      notes: body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ person: data })
}

// PATCH — update a person contact by id
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const allowed = ['name', 'role', 'email', 'phone', 'notes']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key]
  }

  const { data, error } = await supabaseAdmin
    .from('sponsor_people')
    .update(update)
    .eq('id', id as string)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ person: data })
}

// DELETE — delete a person contact by id
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin.from('sponsor_people').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
