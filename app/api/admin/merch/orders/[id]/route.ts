import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'

/*
 * Fulfillment of one merch order: status, carrier, tracking code, shipping
 * date and internal notes. Nothing else can be written from here: payment
 * status, amounts and customer data stay as Stripe and the webhook left them.
 * Privileged roles (BoD, Management) or the Media team only.
 */

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FULFILLMENT_STATUSES = ['new', 'preparing', 'shipped', 'delivered', 'cancelled'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** A trimmed text up to `max` characters; empty means null. Undefined when the value is not text. */
function text(v: unknown, max: number): string | null | undefined {
  if (v === null) return null
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  if (t.length > max) return undefined
  return t || null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireTeamAccess('media'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Unknown order' }, { status: 400 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const update: Record<string, string | null> = {}

  if ('fulfillment_status' in body) {
    if (!FULFILLMENT_STATUSES.includes(body.fulfillment_status as typeof FULFILLMENT_STATUSES[number])) {
      return NextResponse.json({ error: 'Unknown fulfillment status' }, { status: 400 })
    }
    update.fulfillment_status = body.fulfillment_status as string
  }
  for (const [key, max] of [['carrier', 100], ['tracking_code', 200], ['internal_notes', 4000]] as const) {
    if (!(key in body)) continue
    const v = text(body[key], max)
    if (v === undefined) return NextResponse.json({ error: `Invalid ${key.replace('_', ' ')}` }, { status: 400 })
    update[key] = v
  }
  if ('shipped_at' in body) {
    const v = body.shipped_at
    if (v === null || v === '') update.shipped_at = null
    else if (typeof v === 'string' && DATE.test(v) && !isNaN(Date.parse(v))) update.shipped_at = `${v}T12:00:00Z`
    else return NextResponse.json({ error: 'Invalid shipping date' }, { status: 400 })
  }

  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })

  const { data, error } = await supabase
    .from('merch_orders')
    .update(update)
    .eq('id', id)
    .select('id, fulfillment_status, carrier, tracking_code, shipped_at, internal_notes')
    .maybeSingle()
  if (error) {
    console.error('merch orders: fulfillment update failed', error.code)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: 'Unknown order' }, { status: 404 })
  return NextResponse.json({ order: data })
}
