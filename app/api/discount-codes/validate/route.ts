import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type DiscountCode = {
  id: string
  code: string
  type: 'percentage' | 'fixed'
  value: number
  max_uses: number | null
  uses_count: number
  expires_at: string | null
  active: boolean
}

// POST /api/discount-codes/validate — public
// Body: { code: string; subtotalCents: number }
// Returns: { valid, discountCents, description, codeId }
export async function POST(req: NextRequest) {
  try {
    const { code, subtotalCents } = await req.json() as { code: string; subtotalCents: number }

    if (!code?.trim()) return NextResponse.json({ valid: false, error: 'No code provided' })

    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle()

    if (error) return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
    if (!data) return NextResponse.json({ valid: false, error: 'Invalid code' })

    const dc = data as DiscountCode

    // Check expiry
    if (dc.expires_at && new Date(dc.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Code has expired' })
    }

    // Check max uses
    if (dc.max_uses !== null && dc.uses_count >= dc.max_uses) {
      return NextResponse.json({ valid: false, error: 'Code has reached its usage limit' })
    }

    // Compute discount
    let discountCents: number
    let description: string
    if (dc.type === 'percentage') {
      discountCents = Math.round(subtotalCents * dc.value / 100)
      description = `${dc.value}% off`
    } else {
      discountCents = Math.min(dc.value, subtotalCents)
      description = `€${(dc.value / 100).toFixed(2).replace('.', ',')} off`
    }

    return NextResponse.json({ valid: true, discountCents, description, codeId: dc.id })
  } catch {
    return NextResponse.json({ valid: false, error: 'Server error' }, { status: 500 })
  }
}
