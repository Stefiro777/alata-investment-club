import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    if (!(await requirePrivilegedAccess())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { items } = await req.json() as { items: { id: string; order_index: number }[] }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    const results = await Promise.all(
      items.map(({ id, order_index }) =>
        serviceClient.from('alumni').update({ order_index }).eq('id', id)
      )
    )

    const failed = results.find(r => r.error)
    if (failed?.error) {
      return NextResponse.json({ error: 'update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[alumni/reorder] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
