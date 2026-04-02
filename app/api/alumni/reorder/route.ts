import { createServiceClient } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth failed:', authError)
      return NextResponse.json({ error: 'auth failed', detail: authError }, { status: 401 })
    }

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()
    if (!adminRow) {
      console.error('Not admin:', user.email)
      return NextResponse.json({ error: 'not admin' }, { status: 403 })
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
      console.error('Update failed:', failed.error)
      return NextResponse.json({ error: 'update failed', detail: failed.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[alumni/reorder] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
