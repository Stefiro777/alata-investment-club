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

type EventRegistrationPayload = {
  eventId:               string
  firstName:             string
  lastName:              string
  email:                 string
  annoStudio:            string
  motivation?:           string
  questionsForPanelists?: string
}

export async function POST(req: NextRequest) {
  const {
    items, customerName, customerEmail, shippingAddress, eventRegistrations,
    shippingZone, shippingCents, discountCode, discountCents,
  } = await req.json() as {
    items:               UnifiedLineItem[]
    customerName:        string
    customerEmail:       string
    shippingAddress:     ShippingAddress | null
    eventRegistrations?: EventRegistrationPayload[]
    shippingZone?:       string | null
    shippingCents?:      number
    discountCode?:       string | null
    discountCents?:      number
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

  // Build Stripe line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(i => ({
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
  }))

  // Add shipping as a line item
  const actualShippingCents = shippingCents ?? 0
  if (actualShippingCents > 0) {
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: { name: `Shipping — ${shippingZone ?? 'Standard'}` },
        unit_amount: actualShippingCents,
      },
      quantity: 1,
    })
  }

  // Create Stripe coupon for discount
  const actualDiscountCents = discountCents ?? 0
  let couponId: string | undefined
  if (actualDiscountCents > 0 && discountCode) {
    try {
      const coupon = await stripe.coupons.create({
        amount_off: actualDiscountCents,
        currency:   'eur',
        duration:   'once',
        name:       discountCode,
      })
      couponId = coupon.id
    } catch (e) {
      console.error('Failed to create Stripe coupon:', e)
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode:           'payment',
    customer_email: customerEmail,
    line_items:     lineItems,
    success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}/checkout`,
    metadata: {
      type:           'unified',
      product_names:  productNames.slice(0, 500),
      customerName:   customerName.slice(0, 200),
      customerEmail:  customerEmail.slice(0, 200),
      shippingAddress: shippingAddress ? JSON.stringify(shippingAddress).slice(0, 500) : '',
      shippingZone:   shippingZone ?? '',
      shippingCents:  String(actualShippingCents),
      discountCode:   discountCode ?? '',
      discountCents:  String(actualDiscountCents),
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
      eventRegistrations: eventRegistrations
        ? JSON.stringify(eventRegistrations).slice(0, 500)
        : '',
    },
  }

  if (couponId) {
    sessionParams.discounts = [{ coupon: couponId }]
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return NextResponse.json({ url: session.url })
}
