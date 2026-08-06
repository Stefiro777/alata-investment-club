import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Shared privileged-access check (bod/director)
const checkAuth = requirePrivilegedAccess

export async function GET() {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .select(`
      id,
      event_id,
      nome,
      cognome,
      email,
      telefono,
      anno_di_studio,
      motivazione,
      questions_for_panelists,
      created_at,
      source,
      added_by,
      checked_in,
      checked_in_at,
      checked_in_by,
      upcoming_events (
        title,
        date
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { id?: string; [key: string]: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id, ...fields } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('event_registrations')
    .update(fields)
    .eq('id', id)
    .select(`
      id,
      event_id,
      nome,
      cognome,
      email,
      telefono,
      anno_di_studio,
      motivazione,
      questions_for_panelists,
      created_at,
      source,
      added_by,
      checked_in,
      checked_in_at,
      checked_in_by,
      upcoming_events (
        title,
        date
      )
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await checkAuth()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let id: string | null = req.nextUrl.searchParams.get('id')
  if (!id) {
    try {
      const body = await req.json()
      id = body.id ?? null
    } catch {
      // ignore
    }
  }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('event_registrations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
