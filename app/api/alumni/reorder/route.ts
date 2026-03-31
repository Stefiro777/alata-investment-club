import { createServiceClient } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Verify caller is authenticated admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { items } = await req.json() as { items: { id: string; order_index: number }[] }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    // Use service role to bypass RLS
    const serviceClient = createServiceClient()
    const results = await Promise.all(
      items.map(({ id, order_index }) =>
        serviceClient.from('alumni').update({ order_index }).eq('id', id)
      )
    )

    const failed = results.find(r => r.error)
    if (failed?.error) {
      console.error('[alumni/reorder] Supabase update error:', failed.error)
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[alumni/reorder] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
