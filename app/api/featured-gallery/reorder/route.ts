import { createServiceClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const ALLOWED_TABLES = ['featured_events', 'featured_partners']

export async function POST(req: NextRequest) {
  try {
    if (!(await requirePrivilegedAccess())) return NextResponse.json({ error: 'not admin' }, { status: 403 })

    const { table, items } = await req.json() as { table: string; items: { id: string; display_order: number }[] }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'invalid table' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    const serviceClient = createServiceClient()
    const results = await Promise.all(
      items.map(({ id, display_order }) =>
        serviceClient.from(table).update({ display_order }).eq('id', id)
      )
    )

    const failed = results.find(r => r.error)
    if (failed?.error) return NextResponse.json({ error: 'update failed' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
