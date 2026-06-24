import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('id, full_name, email')
    .eq('email', user.email ?? '')
    .maybeSingle()

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const { data: settings } = await supabaseAdmin
    .from('membership_settings')
    .select('price_cents')
    .limit(1)
    .single()

  const priceCents = settings?.price_cents ?? 2000

  const paymentIntent = await stripe.paymentIntents.create({
    amount: priceCents,
    currency: 'eur',
    metadata: {
      type:       'membership',
      user_id:    user.id,
      user_email: member.email ?? '',
      name:       member.full_name ?? '',
    },
  })

  return NextResponse.json({ clientSecret: paymentIntent.client_secret })
}
