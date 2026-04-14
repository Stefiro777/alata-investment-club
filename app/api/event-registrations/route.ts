import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const serviceClient = () =>
  createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

// POST /api/event-registrations — public, no auth required
export async function POST(req: NextRequest) {
  try {
    const {
      event_id,
      nome,
      cognome,
      email,
      telefono,
      anno_di_studio,
      motivazione,
    } = await req.json()

    if (!event_id || !nome || !cognome || !email || !anno_di_studio || !motivazione) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = serviceClient()
    const { error } = await supabase.from('event_registrations').insert({
      event_id,
      nome,
      cognome,
      email,
      telefono: telefono ?? null,
      anno_di_studio,
      motivazione,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/event-registrations?event_id=... — admin only
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const event_id = req.nextUrl.searchParams.get('event_id')
    if (!event_id) {
      return NextResponse.json({ error: 'event_id required' }, { status: 400 })
    }

    const { data, error } = await serviceClient()
      .from('event_registrations')
      .select('*')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
