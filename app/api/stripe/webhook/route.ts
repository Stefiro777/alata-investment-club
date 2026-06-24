import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import Stripe from 'stripe'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Career Service <noreply@alatainvestmentclub.com>'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function buildConfirmationHtml(params: {
  name: string
  serviceName: string
  slotDate: string
  slotTime: string
  motivation: string
  goal: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#1a4a3a;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#a8c5b8;letter-spacing:2px;text-transform:uppercase;">Alata Career Service</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">Booking Confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">Dear ${params.name},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
              Your payment has been received and your booking for <strong>${params.serviceName}</strong> is confirmed.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 20px;width:100%;">
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;width:40%;font-weight:600;">Date</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#1a1a1a;">${params.slotDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-size:13px;color:#555;font-weight:600;">Time</td>
                <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;">${params.slotTime}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;font-weight:600;">Motivation</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#1a1a1a;">${params.motivation}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-size:13px;color:#555;font-weight:600;">Goal</td>
                <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;">${params.goal}</td>
              </tr>
            </table>
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
              Our team will be in touch with further details closer to your session.
            </p>
            <p style="margin:0;font-size:14px;color:#555;">Alata Career Service Team</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f4f7f4;border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:11px;color:#888;">Alata Investment Club &bull; alatainvestmentclub.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildNotificationHtml(params: {
  name: string
  email: string
  serviceName: string
  slotDate: string
  slotTime: string
  motivation: string
  goal: string
  cvUrl?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#1a4a3a;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#a8c5b8;letter-spacing:2px;text-transform:uppercase;">Alata Career Service</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">New Booking – ${params.serviceName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;">
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;width:40%;font-weight:600;">Name</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#1a1a1a;">${params.name}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-size:13px;color:#555;font-weight:600;">Email</td>
                <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;">${params.email}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;font-weight:600;">Service</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#1a1a1a;">${params.serviceName}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-size:13px;color:#555;font-weight:600;">Date</td>
                <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;">${params.slotDate}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;font-weight:600;">Time</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#1a1a1a;">${params.slotTime}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;font-size:13px;color:#555;font-weight:600;">Motivation</td>
                <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;">${params.motivation}</td>
              </tr>
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;font-weight:600;">Goal</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#1a1a1a;">${params.goal}</td>
              </tr>
              ${params.cvUrl ? `<tr>
                <td style="padding:8px 12px;font-size:13px;color:#555;font-weight:600;">CV</td>
                <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;"><a href="${params.cvUrl}" style="color:#1a4a3a;">Download CV</a></td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f4f7f4;border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:11px;color:#888;">Alata Investment Club &bull; alatainvestmentclub.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 })
  }

  // ── Membership: checkout.session.completed ───────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    if (session.metadata?.type === 'merch') {
      // Record merch sale as transaction
      try {
        const amountCents = session.amount_total ?? 0
        const net = amountCents / 100

        let categoryId: string | null = null
        const { data: cat } = await supabaseAdmin
          .from('budget_categories').select('id').eq('name', 'Merch').maybeSingle()
        if (cat) {
          categoryId = cat.id
        } else {
          const { data: nc } = await supabaseAdmin
            .from('budget_categories').insert({ name: 'Merch', type: 'revenue' }).select('id').single()
          categoryId = nc?.id ?? null
        }
        await supabaseAdmin.from('transactions').insert({
          type:        'revenue',
          date:        new Date().toISOString().slice(0, 10),
          amount:      net,
          description: `Vendita merch: ${(session.metadata.product_names ?? '').slice(0, 200)}`,
          category_id: categoryId,
          note:        `Stripe Session: ${session.id}`,
          receipt_url: null,
        })

        // CRM: record customer
        const custEmail = session.customer_details?.email ?? session.metadata.email ?? ''
        const custName  = session.customer_details?.name  ?? session.metadata.name  ?? ''
        if (custEmail) {
          await supabaseAdmin.from('crm_customers').insert({
            name: custName || custEmail, email: custEmail, type: 'merch',
            reference: (session.metadata.product_names ?? '').slice(0, 255),
            amount: net, purchased_at: new Date().toISOString(),
          }).then(() => {})
        }
      } catch (e) { console.error('Failed to record merch transaction:', e) }
    } else if (session.metadata?.type === 'membership') {
      const userId   = session.metadata.user_id
      const memberId = session.metadata.member_id
      const email    = session.metadata.email ?? ''
      const name     = session.metadata.name ?? ''

      // Extend membership by 1 year from today
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      await supabaseAdmin
        .from('club_members')
        .update({ membership_expires_at: expiresAt.toISOString() })
        .eq('id', memberId)

      // Record transaction
      try {
        const amountCents = session.amount_total ?? 0
        const net = amountCents / 100

        let categoryId: string | null = null
        const { data: cat } = await supabaseAdmin
          .from('budget_categories')
          .select('id')
          .eq('name', 'Membership')
          .maybeSingle()
        if (cat) {
          categoryId = cat.id
        } else {
          const { data: newCat } = await supabaseAdmin
            .from('budget_categories')
            .insert({ name: 'Membership', type: 'revenue' })
            .select('id')
            .single()
          categoryId = newCat?.id ?? null
        }

        await supabaseAdmin.from('transactions').insert({
          type:        'revenue',
          date:        new Date().toISOString().slice(0, 10),
          amount:      net,
          description: `Quota membership ${email}`,
          category_id: categoryId,
          note:        `Stripe Session: ${session.id} | User: ${userId}`,
          receipt_url: null,
        })
        // CRM: record customer
        if (email) {
          await supabaseAdmin.from('crm_customers').insert({
            name: name || email, email, type: 'membership',
            reference: 'Quota Membership', amount: net, purchased_at: new Date().toISOString(),
          }).then(() => {})
        }
      } catch (txErr) {
        console.error('Failed to record membership transaction:', txErr)
      }
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    // ── Membership PaymentIntent ───────────────────────────────────────────────
    if (paymentIntent.metadata?.type === 'membership') {
      const userEmail = paymentIntent.metadata.user_email ?? ''
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      await supabaseAdmin
        .from('club_members')
        .update({ membership_expires_at: expiresAt.toISOString() })
        .eq('email', userEmail)

      try {
        const net = paymentIntent.amount / 100

        let categoryId: string | null = null
        const { data: cat } = await supabaseAdmin
          .from('budget_categories').select('id').eq('name', 'Membership').maybeSingle()
        if (cat) {
          categoryId = cat.id
        } else {
          const { data: newCat } = await supabaseAdmin
            .from('budget_categories').insert({ name: 'Membership', type: 'revenue' }).select('id').single()
          categoryId = newCat?.id ?? null
        }

        await supabaseAdmin.from('transactions').insert({
          type:        'revenue',
          date:        new Date().toISOString().slice(0, 10),
          amount:      net,
          description: `Quota membership ${userEmail}`,
          category_id: categoryId,
          note:        `PaymentIntent: ${paymentIntent.id} | User: ${paymentIntent.metadata.user_id}`,
          receipt_url: null,
        })

        if (userEmail) {
          const name = paymentIntent.metadata.name ?? userEmail
          await supabaseAdmin.from('crm_customers').insert({
            name: name || userEmail, email: userEmail, type: 'membership',
            reference: 'Quota Membership', amount: net, purchased_at: new Date().toISOString(),
          }).then(() => {})
        }
      } catch (e) {
        console.error('Failed to record membership transaction (PI):', e)
      }

      return NextResponse.json({ received: true })
    }

    // ── Career booking handling ────────────────────────────────────────────────
    const { data: booking, error: findErr } = await supabaseAdmin
      .from('career_bookings')
      .select('id, status, service_id, slot_date, slot_time, name, email, motivation, goal, cv_url')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (!findErr && booking) {
      if (booking.status === 'confirmed') {
        return NextResponse.json({ received: true, skipped: 'already_processed' })
      }
      await supabaseAdmin
        .from('career_bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id)

      const { data: service } = await supabaseAdmin
        .from('career_services')
        .select('name')
        .eq('id', booking.service_id)
        .single()

      const serviceName = service?.name ?? 'Career Service'

      const { data: contacts } = await supabaseAdmin
        .from('career_notification_contacts')
        .select('email')
        .eq('service_id', booking.service_id)

      const confirmationHtml = buildConfirmationHtml({
        name: booking.name,
        serviceName,
        slotDate: booking.slot_date,
        slotTime: booking.slot_time,
        motivation: booking.motivation,
        goal: booking.goal,
      })

      const notificationHtml = buildNotificationHtml({
        name: booking.name,
        email: booking.email,
        serviceName,
        slotDate: booking.slot_date,
        slotTime: booking.slot_time,
        motivation: booking.motivation,
        goal: booking.goal,
        cvUrl: booking.cv_url ?? undefined,
      })

      await Promise.allSettled([
        resend.emails.send({
          from: FROM,
          to: booking.email,
          subject: `Booking Confirmed – ${serviceName} | Alata Career Service`,
          html: confirmationHtml,
        }),
        ...(contacts ?? []).map(c =>
          resend.emails.send({
            from: FROM,
            to: c.email,
            subject: `New Booking – ${serviceName}`,
            html: notificationHtml,
          })
        ),
      ])
    } else {
      console.error('Booking not found for payment intent:', paymentIntent.id)
    }

    // ── Auto-record finance transaction ───────────────────────────────────────
    try {
      const gross = paymentIntent.amount / 100
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string)
      const balanceTx = await stripe.balanceTransactions.retrieve(charge.balance_transaction as string)
      const net = balanceTx.net / 100
      const fee = balanceTx.fee / 100

      const description = (paymentIntent.metadata?.service_name as string | undefined)
        ?? paymentIntent.description
        ?? 'Stripe Payment'
      const date = new Date().toISOString().slice(0, 10)

      // Look up or create the 'Career Service' revenue category
      let categoryId: string | null = null
      const { data: existingCat } = await supabaseAdmin
        .from('budget_categories')
        .select('id')
        .eq('name', 'Career Service')
        .eq('type', 'revenue')
        .maybeSingle()

      if (existingCat) {
        categoryId = existingCat.id
      } else {
        const { data: newCat } = await supabaseAdmin
          .from('budget_categories')
          .insert({ name: 'Career Service', type: 'revenue' })
          .select('id')
          .single()
        categoryId = newCat?.id ?? null
      }

      await supabaseAdmin.from('transactions').insert({
        type:        'revenue',
        date,
        amount:      net,
        description,
        category_id: categoryId,
        note:        `Netto: €${net.toFixed(2)} | Lordo: €${gross.toFixed(2)} | Commissioni Stripe: €${fee.toFixed(2)} | ${paymentIntent.id}`,
        receipt_url: null,
      })

      // CRM: record career service customer
      if (booking?.email) {
        await supabaseAdmin.from('crm_customers').insert({
          name: booking.name || booking.email, email: booking.email, type: 'career_service',
          reference: description, amount: net, purchased_at: new Date().toISOString(),
        }).then(() => {})
      }
    } catch (txErr) {
      console.error('Failed to record transaction for payment intent:', paymentIntent.id, txErr)
    }
  }

  return NextResponse.json({ received: true })
}
