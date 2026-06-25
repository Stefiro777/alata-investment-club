import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'

export type UnifiedLineItem = {
  type:          'merch' | 'ticket'
  referenceId:   string
  name:          string
  priceCents:    number
  quantity:      number
  variantColor?: string
  size?:         string
  eventDate?:    string
  eventLocation?: string
}

export type ShippingAddress = {
  firstName:    string
  lastName:     string
  email:        string
  addressLine1: string
  addressLine2?: string
  city:         string
  postalCode:   string
  country:      string
}

export async function POST(req: NextRequest) {
  const { items, customerName, customerEmail, shippingAddress } = await req.json() as {
    items:            UnifiedLineItem[]
    customerName:     string
    customerEmail:    string
    shippingAddress:  ShippingAddress | null
  }

  if (!items?.length)   return NextResponse.json({ error: 'Cart is empty' },   { status: 400 })
  if (!customerEmail)   return NextResponse.json({ error: 'Email required' },   { status: 400 })

  const merchItems  = items.filter(i => i.type === 'merch')
  const ticketItems = items.filter(i => i.type === 'ticket')

  const productNames = items
    .map(i => {
      if (i.type === 'merch') {
        return `${i.name}${i.variantColor ? ` (${i.variantColor}` : ''}${i.size ? `/${i.size})` : i.variantColor ? ')' : ''}`
      }
      return i.name
    })
    .join(', ')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: customerEmail,
    line_items: items.map(i => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: i.type === 'merch' && i.variantColor
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
      type:           'unified',
      product_names:  productNames.slice(0, 500),
      customerName:   customerName.slice(0, 200),
      customerEmail:  customerEmail.slice(0, 200),
      shippingAddress: shippingAddress ? JSON.stringify(shippingAddress).slice(0, 500) : '',
      merchItems: JSON.stringify(
        merchItems.map(i => ({
          referenceId: i.referenceId, name: i.name, priceCents: i.priceCents,
          quantity: i.quantity, variantColor: i.variantColor ?? null, size: i.size ?? null,
        }))
      ).slice(0, 500),
      ticketItems: JSON.stringify(
        ticketItems.map(i => ({
          referenceId: i.referenceId, name: i.name,
          eventDate: i.eventDate ?? null, eventLocation: i.eventLocation ?? null,
        }))
      ).slice(0, 500),

    },
  })

  return NextResponse.json({ url: session.url })
}
