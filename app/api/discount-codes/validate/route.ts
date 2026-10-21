import { NextRequest, NextResponse } from 'next/server'
import { resolveDiscount } from '@/lib/discount-codes'

// POST /api/discount-codes/validate — public (members-only codes are checked server-side)
// Body: { code: string; subtotalCents: number }
// Returns: { valid, discountCents, description, codeId } or { valid: false, error, reason? }
export async function POST(req: NextRequest) {
  try {
    const { code, subtotalCents } = await req.json() as { code: string; subtotalCents: number }

    const result = await resolveDiscount(code, subtotalCents, req.headers.get('authorization'))
    if (!result.ok) {
      if (result.status === 500) return NextResponse.json({ valid: false, error: result.error }, { status: 500 })
      return NextResponse.json({ valid: false, error: result.error, reason: result.denial })
    }
    return NextResponse.json({
      valid: true, discountCents: result.discountCents, description: result.description, codeId: result.codeId,
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
