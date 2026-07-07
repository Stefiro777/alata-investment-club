import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    // Step 1: auth
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Step 2: member lookup
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('club_members')
      .select('id, full_name, email')
      .eq('email', user.email ?? '')
      .maybeSingle()
    if (memberErr || !member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Step 3: membership_settings
    const { data: settings } = await supabaseAdmin
      .from('membership_settings')
      .select('price_cents')
      .limit(1)
      .single()

    // Step 4: Stripe PaymentIntent
    const amount = Math.round(Number(settings?.price_cents ?? 2000))
    if (!amount || amount < 50) throw new Error('Invalid amount: ' + amount)

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type:       'membership',
        user_id:    user.id,
        user_email: member.email ?? '',
      },
    })

    return NextResponse.json({ clientSecret: pi.client_secret })
  } catch (err: unknown) {
    console.error('[payment-intent] CRASH:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
