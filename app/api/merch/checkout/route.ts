/*
 * SQL DA ESEGUIRE MANUALMENTE NEL SUPABASE SQL EDITOR
 * ─────────────────────────────────────────────────────
 *
 * -- 1. Tabella upsell
 * CREATE TABLE merch_upsell_items (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   type TEXT NOT NULL CHECK (type IN ('product', 'event')),
 *   reference_id UUID NOT NULL,
 *   label TEXT,
 *   priority INTEGER DEFAULT 0,
 *   active BOOLEAN DEFAULT true,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE merch_upsell_items ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Public read active upsell" ON merch_upsell_items
 *   FOR SELECT USING (active = true);
 * CREATE POLICY "Admin manage upsell" ON merch_upsell_items
 *   FOR ALL USING (
 *     EXISTS (
 *       SELECT 1 FROM club_members
 *       WHERE club_members.email = auth.email()
 *       AND club_members.role IN ('bod', 'director')
 *     ) OR auth.email() = 'finullistefano@gmail.com'
 *   );
 *
 * -- 2. Tabella ordini merch
 * CREATE TABLE merch_orders (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   stripe_session_id TEXT UNIQUE NOT NULL,
 *   product_id UUID REFERENCES products(id) ON DELETE SET NULL,
 *   product_name TEXT NOT NULL,
 *   variant_color TEXT,
 *   size TEXT,
 *   quantity INTEGER DEFAULT 1,
 *   price_cents INTEGER,
 *   upsell_items JSONB,
 *   customer_name TEXT,
 *   customer_email TEXT,
 *   shipping_address JSONB,
 *   status TEXT DEFAULT 'paid',
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE merch_orders ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Admin read merch_orders" ON merch_orders
 *   FOR ALL USING (
 *     EXISTS (
 *       SELECT 1 FROM club_members
 *       WHERE club_members.email = auth.email()
 *       AND club_members.role IN ('bod', 'director')
 *     ) OR auth.email() = 'finullistefano@gmail.com'
 *   );
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'

export type CheckoutLineItem = {
  type:         'product' | 'event'
  referenceId:  string
  name:         string
  priceCents:   number
  variantColor?: string
  size?:        string
  quantity:     number
  eventDate?:   string
}

export type ShippingAddress = {
  firstName:   string
  lastName:    string
  email:       string
  addressLine1: string
  addressLine2?: string
  city:        string
  postalCode:  string
  country:     string
}

export async function POST(req: NextRequest) {
  const { items, customerName, customerEmail, shippingAddress } = await req.json() as {
    items: CheckoutLineItem[]
    customerName: string
    customerEmail: string
    shippingAddress: ShippingAddress
  }

  if (!items?.length)      return NextResponse.json({ error: 'Cart is empty' },          { status: 400 })
  if (!customerEmail)      return NextResponse.json({ error: 'Email required' },          { status: 400 })
  if (!shippingAddress)    return NextResponse.json({ error: 'Shipping address required' }, { status: 400 })

  const merchItems  = items.filter(i => i.type === 'product')
  const ticketItems = items.filter(i => i.type === 'event')
  const upsellItems = items.filter(i => i.type !== 'product' && i.type !== 'event')
  const main = merchItems[0] ?? items[0]  // fallback to first item if no merch

  const productNames = items
    .map(i => `${i.name}${i.variantColor ? ` (${i.variantColor}` : ''}${i.size ? `/${i.size})` : i.variantColor ? ')' : ''}`)
    .join(', ')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    line_items: items.map(i => ({
      price_data: {
        currency:     'eur',
        product_data: {
          name: i.variantColor
            ? `${i.name} — ${i.variantColor}${i.size ? ` / ${i.size}` : ''}`
            : i.name,
        },
        unit_amount: i.priceCents,
      },
      quantity: i.quantity,
    })),
    success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}/checkout`,
    metadata: {
      type:             'merch',
      product_names:    productNames.slice(0, 500),
      mainProductId:    main.referenceId,
      mainProductName:  main.name,
      variantColor:     main.variantColor ?? '',
      size:             main.size ?? '',
      upsellItems:      JSON.stringify(upsellItems).slice(0, 500),
      ticketItems:      JSON.stringify(ticketItems.map(t => ({
        referenceId: t.referenceId, name: t.name, eventDate: t.eventDate ?? null,
      }))).slice(0, 500),
      customerName:     customerName.slice(0, 200),
      customerEmail:    customerEmail.slice(0, 200),
      shippingAddress:  JSON.stringify(shippingAddress).slice(0, 500),
    },
  })

  return NextResponse.json({ url: session.url })
}
