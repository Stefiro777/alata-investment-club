import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'

type CheckoutItem = {
  name: string
  priceCents: number
  quantity: number
  productId: string
  variant: string
  size: string
}

export async function POST(req: NextRequest) {
  const { items } = (await req.json()) as { items: CheckoutItem[] }
  if (!items?.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  const productNames = items.map(i => `${i.name} (${i.variant}/${i.size})`).join(', ')

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: items.map(i => ({
      price_data: {
        currency: 'eur',
        product_data: { name: `${i.name} — ${i.variant} / ${i.size}` },
        unit_amount: i.priceCents,
      },
      quantity: i.quantity,
    })),
    success_url: `${BASE_URL}/merch?checkout=success`,
    cancel_url:  `${BASE_URL}/merch`,
    metadata: {
      type:          'merch',
      product_names: productNames.slice(0, 500),
      product_ids:   items.map(i => i.productId).join(',').slice(0, 500),
    },
  })

  return NextResponse.json({ url: session.url })
}
