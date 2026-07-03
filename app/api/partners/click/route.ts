import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  try {
    const { partnerId } = await req.json() as { partnerId?: string }
    if (!partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 })
    if (!UUID_REGEX.test(partnerId)) return NextResponse.json({ error: 'invalid partnerId' }, { status: 400 })

    const serviceClient = createServiceClient()

    // Atomic increment via RPC — avoids the read-then-write race.
    const { error } = await serviceClient.rpc('increment_partner_click', { p_partner_id: partnerId })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
