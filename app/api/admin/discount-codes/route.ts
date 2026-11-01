import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { requireTeamAccess } from '@/lib/auth'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** Media team (who runs the shop), BoD and Management; the superadmin is a 'bod' member. */
async function requireAdmin() {
  return requireTeamAccess('media')
}

// GET /api/admin/discount-codes
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codes: data ?? [] })
}

// POST /api/admin/discount-codes — create
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { code, type, value, max_uses, expires_at, members_only } = body

  if (!code?.trim() || !type || value == null)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .insert({
      code: code.trim().toUpperCase(),
      type,
      value,
      max_uses: max_uses ?? null,
      expires_at: expires_at || null,
      uses_count: 0,
      active: true,
      members_only: members_only === true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code: data })
}

// PATCH /api/admin/discount-codes — update (toggle active, etc.)
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...body } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  // Whitelist: only these columns can be changed through this endpoint.
  const ALLOWED = ['active', 'members_only', 'max_uses', 'expires_at', 'value', 'type'] as const
  const updates: Record<string, unknown> = Object.fromEntries(ALLOWED.filter(k => k in body).map(k => [k, body[k]]))
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const { data: current, error: currentErr } = await supabaseAdmin
    .from('discount_codes').select('type, value, uses_count').eq('id', id).maybeSingle()
  if (currentErr) return NextResponse.json({ error: currentErr.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Code not found' }, { status: 404 })

  const bad = (error: string) => NextResponse.json({ error }, { status: 400 })

  if ('active' in updates && typeof updates.active !== 'boolean') return bad('Invalid active flag')
  if ('members_only' in updates && typeof updates.members_only !== 'boolean') return bad('Invalid members-only flag')

  // type and value are validated together, against what the row will look like.
  const type  = ('type'  in updates ? updates.type  : current.type)  as string
  const value = ('value' in updates ? Number(updates.value) : current.value) as number
  if (type !== 'percentage' && type !== 'fixed') return bad('Invalid type')
  if (!Number.isInteger(value) || value <= 0) return bad('Value must be a positive whole number')
  if (type === 'percentage' && value > 100) return bad('Percentage must be between 1 and 100')
  if ('value' in updates) updates.value = value

  if ('max_uses' in updates) {
    if (updates.max_uses === '' || updates.max_uses == null) updates.max_uses = null
    else {
      const maxUses = Number(updates.max_uses)
      if (!Number.isInteger(maxUses) || maxUses < 1) return bad('Max uses must be a positive whole number')
      if (maxUses < (current.uses_count ?? 0)) return bad(`Max uses cannot be lower than the uses already made (${current.uses_count})`)
      updates.max_uses = maxUses
    }
  }

  if ('expires_at' in updates) {
    if (!updates.expires_at) updates.expires_at = null
    else if (Number.isNaN(new Date(updates.expires_at as string).getTime())) return bad('Invalid expiry date')
  }

  const { error } = await supabaseAdmin
    .from('discount_codes')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/discount-codes?id=...
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('discount_codes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
