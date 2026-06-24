import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'

export async function POST(req: NextRequest) {
  // Authenticate via Bearer token
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch member record
  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('id, email, full_name')
    .eq('email', user.email ?? '')
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  // Fetch price from membership_settings
  const { data: settings } = await supabaseAdmin
    .from('membership_settings')
    .select('price_cents, description')
    .limit(1)
    .single()

  const priceCents = settings?.price_cents ?? 2000
  const description = settings?.description ?? 'Quota annuale membership Alata Investment Club'

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Quota Membership Alata Investment Club',
            description,
          },
          unit_amount: priceCents,
        },
        quantity: 1,
      },
    ],
    customer_email: member.email,
    success_url: `${BASE_URL}/dashboard?membership=success`,
    cancel_url:  `${BASE_URL}/dashboard/membership`,
    metadata: {
      type:       'membership',
      user_id:    user.id,
      member_id:  member.id,
      user_email: member.email ?? '',
      name:       member.full_name ?? '',
    },
  })

  return NextResponse.json({ url: session.url })
}
