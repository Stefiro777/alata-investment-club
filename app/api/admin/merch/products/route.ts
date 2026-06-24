import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function isAdmin(token: string | null) {
  if (!token) return false
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return false
  const { data: m } = await supabase.from('club_members').select('role, teams').eq('email', user.email ?? '').maybeSingle()
  return m?.role === 'bod' || m?.role === 'director' ||
    (Array.isArray(m?.teams) && (m.teams as string[]).includes('media')) ||
    (user.email ?? null) === 'finullistefano@gmail.com'
}

function tok(req: NextRequest) {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null
}

// ── GET all products (admin) ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await supabase
    .from('products')
    .select(`id, slug, name, price_cents, description, sizes, details, visible, created_at,
             product_variants (id, color, color_hex, images, sort_order),
             product_text_variants (id, option, sort_order)`)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data ?? [] })
}

// ── POST create product ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await req.json()
  const { name, slug, price_cents, description, sizes, details, visible } = body
  if (!name || !slug) return NextResponse.json({ error: 'name and slug required' }, { status: 400 })
  const { data, error } = await supabase.from('products')
    .insert({ name, slug, price_cents: price_cents ?? 0, description, sizes, details, visible: visible ?? true })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
}

// ── PATCH update product ──────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { data, error } = await supabase.from('products').update(fields).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
}

// ── DELETE product ────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(tok(req)))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
