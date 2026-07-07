import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { sendOrderConfirmation, sendRegistrationConfirmation } from '@/lib/confirmation-emails'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
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

function safeJson(obj: unknown): string {
  const str = JSON.stringify(obj)
  if (str.length <= 500) return str
  if (Array.isArray(obj)) {
    return JSON.stringify((obj as unknown[]).map((item: unknown) => {
      const i = item as Record<string, unknown>
      return {
        type:        i.type,
        referenceId: i.referenceId ?? i.eventId ?? i.productId,
        name:        (i.name as string)?.slice(0, 50),
        priceCents:  i.priceCents,
        eventId:     i.eventId,
      }
    }))
  }
  return str.slice(0, 500)
}

function safeEventRegs(regs: EventRegistrationPayload[]): string {
  return JSON.stringify(regs.map(r => ({
    eventId:               r.eventId,
    firstName:             r.firstName?.slice(0, 50),
    lastName:              r.lastName?.slice(0, 50),
    email:                 r.email,
    annoStudio:            r.annoStudio,
    motivation:            r.motivation?.slice(0, 100),
    questionsForPanelists: r.questionsForPanelists?.slice(0, 100),
  })))
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

  const actualShippingCents = shippingCents ?? 0
  const actualDiscountCents = discountCents ?? 0

  // Fully free orders are completed entirely server-side (registrations,
  // order records and confirmation emails) — the client only redirects.
  const itemsTotal = items.reduce((sum, i) => sum + (i.priceCents * (i.quantity ?? 1)), 0)
  const grandTotal = itemsTotal + actualShippingCents - actualDiscountCents
  if (grandTotal === 0) {
    // 1. Event registrations
    if (eventRegistrations?.length) {
      for (const r of eventRegistrations) {
        const { error } = await supabaseAdmin.from('event_registrations').insert({
          event_id:                r.eventId,
          nome:                    r.firstName,
          cognome:                 r.lastName,
          email:                   r.email,
          telefono:                null,
          anno_di_studio:          r.annoStudio,
          motivazione:             r.motivation ?? null,
          questions_for_panelists: r.questionsForPanelists ?? null,
        })
        if (error) {
          console.error('Free order: registration insert failed:', error)
          return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
        }
      }
    }

    // 2. Merch order records + CRM
    const freeMerch = items.filter(i => i.type === 'merch' || !i.type)
    // A single id groups all rows of this order; UUID avoids the collisions
    // that `free_${Date.now()}` allowed under concurrent checkouts.
    const freeOrderId = `free_${crypto.randomUUID()}`
    if (freeMerch.length > 0 && customerEmail) {
      try {
        await supabaseAdmin.from('crm_customers').upsert({
          name:         customerName,
          email:        customerEmail,
          type:         'merch',
          reference:    freeMerch.map(i => i.name).join(', ').slice(0, 255),
          amount:       0,
          purchased_at: new Date().toISOString(),
        }, { onConflict: 'email' })
        for (const item of freeMerch) {
          await supabaseAdmin.from('merch_orders').insert({
            stripe_session_id: freeOrderId,
            product_id:        item.referenceId ?? null,
            product_name:      item.name,
            variant_color:     item.variantColor ?? null,
            size:              item.size ?? null,
            quantity:          item.quantity ?? 1,
            price_cents:       0,
            customer_name:     customerName,
            customer_email:    customerEmail,
            shipping_address:  shippingAddress ?? null,
            status:            'paid',
          })
        }
      } catch (e) {
        console.error('Failed to record free merch order:', e)
      }
    }

    // 3. Confirmation emails (failures logged, never block the order)
    const ticketItemsFree = items.filter(i => i.type === 'ticket')
    if (eventRegistrations?.length && eventRegistrations[0].email) {
      await sendRegistrationConfirmation({
        customerEmail: eventRegistrations[0].email,
        customerName:  `${eventRegistrations[0].firstName} ${eventRegistrations[0].lastName}`.trim(),
        events: eventRegistrations.map(r => {
          const ticket = ticketItemsFree.find(t => t.referenceId === r.eventId)
          return {
            name:      ticket?.name ?? 'Event',
            eventDate: ticket?.eventDate ?? null,
            location:  ticket?.eventLocation ?? null,
          }
        }),
      })
    }
    if (freeMerch.length > 0 && customerEmail) {
      await sendOrderConfirmation({
        customerEmail,
        customerName,
        items: freeMerch.map(i => ({
          name:         i.name,
          variantColor: i.variantColor ?? null,
          size:         i.size ?? null,
          quantity:     i.quantity ?? 1,
          priceCents:   0,
        })),
        totalCents:      0,
        shippingCents:   0,
        shippingAddress: shippingAddress ?? null,
      })
    }

    return NextResponse.json({ free: true })
  }

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

  // FIX 1 — exclude free items from Stripe line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items
    .filter(i => i.priceCents > 0)
    .map(i => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: i.type === 'merch' && i.variantColor
            ? `${i.name} — ${i.variantColor}${i.size ? ` / ${i.size}` : ''}`
            : i.name,
        },
        unit_amount: i.priceCents,
      },
      quantity: i.quantity ?? 1,
    }))

  // Add shipping as a line item
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
      // FIX 2 — safe serialization to avoid truncated JSON
      merchItems:         safeJson(merchItems.map(i => ({
        referenceId: i.referenceId, name: i.name, priceCents: i.priceCents,
        quantity: i.quantity, variantColor: i.variantColor ?? null, size: i.size ?? null,
      }))),
      ticketItems:        safeJson(ticketItems.map(i => ({
        referenceId: i.referenceId, name: i.name,
        eventDate: i.eventDate ?? null, eventLocation: i.eventLocation ?? null,
      }))),
      eventRegistrations: eventRegistrations ? safeEventRegs(eventRegistrations) : '',
    },
  }

  if (couponId) {
    sessionParams.discounts = [{ coupon: couponId }]
  }

  // FIX 3 — wrap session creation in try/catch
  try {
    const session = await stripe.checkout.sessions.create(sessionParams)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe session creation failed:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
