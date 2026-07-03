import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const body = await req.json()
    const { data, error } = await supabaseAdmin
      .from('career_availability')
      .insert(body)
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? [])[0] ?? null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const { id, ...fields } = await req.json() as { id: string; [key: string]: unknown }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { data, error } = await supabaseAdmin
      .from('career_availability')
      .update(fields)
      .eq('id', id)
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: (data ?? [])[0] ?? null })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) return forbidden()
  try {
    const { id } = await req.json() as { id: string }
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await supabaseAdmin.from('career_availability').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
