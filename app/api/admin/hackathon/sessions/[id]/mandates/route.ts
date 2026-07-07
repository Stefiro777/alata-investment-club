import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('hackathon_mandates')
    .select('*')
    .eq('session_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byRole = new Map((data ?? []).map((m) => [m.role_key, m]))
  const mandates = ROLES.map((role) => byRole.get(role) ?? { session_id: id, role_key: role, content: '' })

  return NextResponse.json({ mandates })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const body = await request.json() as { mandates?: { role_key?: string; content?: string }[] }
    const mandates = body.mandates
    if (!Array.isArray(mandates) || mandates.length === 0) {
      return NextResponse.json({ error: 'Missing mandates' }, { status: 400 })
    }

    for (const m of mandates) {
      if (!m.role_key || !ROLES.includes(m.role_key as (typeof ROLES)[number])) {
        return NextResponse.json({ error: `Invalid role_key: ${m.role_key}` }, { status: 400 })
      }
    }

    const supabase = createServiceClient()
    const results = []

    for (const m of mandates) {
      const { data: existing, error: existingError } = await supabase
        .from('hackathon_mandates')
        .select('id')
        .eq('session_id', id)
        .eq('role_key', m.role_key)
        .maybeSingle()

      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from('hackathon_mandates')
          .update({ content: m.content ?? '' })
          .eq('id', existing.id)
          .select('*')
          .single()
        if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
        results.push(updated)
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('hackathon_mandates')
          .insert({ session_id: id, role_key: m.role_key, content: m.content ?? '' })
          .select('*')
          .single()
        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
        results.push(inserted)
      }
    }

    return NextResponse.json({ mandates: results })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
