import { NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

export async function GET() {
  const allowed = !!(await requirePrivilegedAccess())
  return NextResponse.json({ allowed })
}
