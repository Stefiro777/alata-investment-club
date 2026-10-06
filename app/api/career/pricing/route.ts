import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSessionPricing } from '@/lib/career-session'

/**
 * Price and duration of a Career session as the caller will actually pay it.
 * Public; send `Authorization: Bearer <access token>` to get the member price (0 for
 * active members). The same computation runs again in /api/career/book.
 */
export async function GET(req: NextRequest) {
  try {
    const pricing = await getSessionPricing(createServiceClient(), req.headers.get('authorization'))
    return NextResponse.json(pricing, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
