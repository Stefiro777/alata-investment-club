import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  try {
    // Step 0: env check
    console.log('[payment-intent] NEXT_PUBLIC_SUPABASE_URL defined:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[payment-intent] SUPABASE_SERVICE_ROLE_KEY defined:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('[payment-intent] STRIPE_SECRET_KEY defined:', !!process.env.STRIPE_SECRET_KEY)

    // Step 1: auth
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    console.log('[payment-intent] token present:', !!token)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    console.log('[payment-intent] getUser error:', authErr?.message ?? null, '| user:', user?.email ?? null)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Step 2: member lookup
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('club_members')
      .select('id, full_name, email')
      .eq('email', user.email ?? '')
      .maybeSingle()
    console.log('[payment-intent] member lookup error:', memberErr?.message ?? null, '| found:', !!member)
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

    // Step 3: membership_settings
    const { data: settings, error: settingsErr } = await supabaseAdmin
      .from('membership_settings')
      .select('price_cents')
      .limit(1)
      .single()
    console.log('[payment-intent] settings error:', settingsErr?.message ?? null, '| price_cents:', settings?.price_cents ?? null)
    const priceCents = settings?.price_cents ?? 2000

    // Step 4: Stripe PaymentIntent
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    console.log('[payment-intent] creating PaymentIntent, amount:', priceCents)
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
    console.log('[payment-intent] PaymentIntent created:', paymentIntent.id)

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (err: unknown) {
    console.error('[payment-intent] CRASH:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
