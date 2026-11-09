import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireTeamAccess } from '@/lib/auth'

/*
 * Merch orders for the Media team page (/dashboard/team/media, Merch).
 * Privileged roles (BoD, Management) or the Media team only; read with the
 * service role on the server, never from the browser. The response carries
 * addresses and phone numbers, so nothing of it is logged.
 */

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ORDER_COLUMNS = [
  'id', 'created_at', 'status', 'customer_name', 'customer_email', 'phone', 'shipping_address',
  'shipping_zone', 'shipping_cents', 'discount_code', 'discount_cents', 'price_cents', 'upsell_items',
  'product_name', 'variant_color', 'size', 'quantity',
  'stripe_session_id', 'stripe_payment_intent_id',
  'fulfillment_status', 'carrier', 'tracking_code', 'shipped_at', 'internal_notes',
].join(', ')

type OrderRow = {
  id: string
  stripe_session_id: string
  stripe_payment_intent_id: string | null
  product_name: string
  variant_color: string | null
  size: string | null
  quantity: number | null
  [key: string]: unknown
}

type ItemRow = {
  order_id: string
  position: number
  product_name: string
  variant_color: string | null
  size: string | null
  quantity: number
  unit_price_cents: number
}

type TxRow = {
  id: string
  date: string | null
  type: string
  amount: number
  gross_amount: number | null
  stripe_fee: number | null
  description: string | null
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
}

export async function GET() {
  if (!(await requireTeamAccess('media'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('merch_orders')
    .select(ORDER_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('merch orders: read failed', error.code)
    return NextResponse.json({ error: 'Could not load the orders' }, { status: 500 })
  }
  const orders = (data ?? []) as unknown as OrderRow[]
  if (orders.length === 0) return NextResponse.json({ orders: [] })

  const sessionIds = orders.map(o => o.stripe_session_id).filter(Boolean)
  const intentIds = orders.map(o => o.stripe_payment_intent_id).filter((v): v is string => !!v)
  const TX_COLUMNS = 'id, date, type, amount, gross_amount, stripe_fee, description, stripe_session_id, stripe_payment_intent_id'

  const [itemsRes, txBySession, txByIntent] = await Promise.all([
    supabase.from('merch_order_items')
      .select('order_id, position, product_name, variant_color, size, quantity, unit_price_cents')
      .in('order_id', orders.map(o => o.id))
      .order('position', { ascending: true }),
    supabase.from('transactions').select(TX_COLUMNS).in('stripe_session_id', sessionIds),
    intentIds.length
      ? supabase.from('transactions').select(TX_COLUMNS).in('stripe_payment_intent_id', intentIds)
      : Promise.resolve({ data: [] as TxRow[] }),
  ])

  const itemsByOrder: Record<string, ItemRow[]> = {}
  for (const it of (itemsRes.data ?? []) as ItemRow[]) (itemsByOrder[it.order_id] ??= []).push(it)

  const txs = new Map<string, TxRow>()
  for (const t of [...((txBySession.data ?? []) as TxRow[]), ...((txByIntent.data ?? []) as TxRow[])]) txs.set(t.id, t)
  const txList = [...txs.values()]

  return NextResponse.json({
    orders: orders.map(o => ({
      ...o,
      // Every article from merch_order_items; an order older than the table keeps its summary line.
      items: itemsByOrder[o.id]?.length
        ? itemsByOrder[o.id].map(({ product_name, variant_color, size, quantity, unit_price_cents }) => ({ product_name, variant_color, size, quantity, unit_price_cents }))
        : [{ product_name: o.product_name, variant_color: o.variant_color, size: o.size, quantity: o.quantity ?? 1, unit_price_cents: null }],
      transactions: txList
        .filter(t => t.stripe_session_id === o.stripe_session_id || (!!o.stripe_payment_intent_id && t.stripe_payment_intent_id === o.stripe_payment_intent_id))
        .map(({ id, date, type, amount, gross_amount, stripe_fee, description }) => ({ id, date, type, amount, gross_amount, stripe_fee, description })),
    })),
  })
}
