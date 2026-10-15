import { NextResponse } from 'next/server'
import { getMemberAccess } from '@/lib/members-only'

export const dynamic = 'force-dynamic'

// GET /api/membership/status — { authenticated, active } for the current session.
export async function GET() {
  return NextResponse.json(await getMemberAccess())
}
