import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const supabase = serviceClient()

    // Fetch current count then increment (no RPC needed)
    const { data: doc } = await supabase
      .from('partner_documents')
      .select('preview_count')
      .eq('id', documentId)
      .single()

    const { error } = await supabase
      .from('partner_documents')
      .update({ preview_count: (doc?.preview_count ?? 0) + 1 })
      .eq('id', documentId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
