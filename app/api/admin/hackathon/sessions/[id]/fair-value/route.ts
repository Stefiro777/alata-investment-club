import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
    .from('hackathon_fair_value')
    .select('*')
    .eq('session_id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    fair_value: data ?? { session_id: id, content: '', valuation_range: '' },
  })
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

    const body = await request.json() as { content?: string; valuation_range?: string }

    const supabase = createServiceClient()
    const { data: existing, error: existingError } = await supabase
      .from('hackathon_fair_value')
      .select('id')
      .eq('session_id', id)
      .maybeSingle()

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 })

    const payload = { content: body.content ?? '', valuation_range: body.valuation_range ?? '' }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('hackathon_fair_value')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single()
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
      return NextResponse.json({ fair_value: updated })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('hackathon_fair_value')
      .insert({ session_id: id, ...payload })
      .select('*')
      .single()
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ fair_value: inserted })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
