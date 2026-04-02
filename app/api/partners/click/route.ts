import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { partnerId } = await req.json() as { partnerId?: string }
    if (!partnerId) return NextResponse.json({ error: 'partnerId required' }, { status: 400 })

    const serviceClient = createServiceClient()
    const { data, error: fetchError } = await serviceClient
      .from('partners')
      .select('click_count')
      .eq('id', partnerId)
      .single()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

    const { error: updateError } = await serviceClient
      .from('partners')
      .update({ click_count: (data.click_count ?? 0) + 1 })
      .eq('id', partnerId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
