import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import Stripe from 'stripe'
import { isCareerCvPath } from '@/lib/cv-path'
import { signedCvUrl } from '@/lib/job-applications'
import { getSessionPricing } from '@/lib/career-session'
import { isSlotBookable, pendingHoldCutoffIso } from '@/lib/career-slots'

// Signed CV links in emails stay valid for a week.
const CV_LINK_TTL_SECONDS = 7 * 24 * 60 * 60

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
              Your booking for <strong>${params.serviceName}</strong> has been confirmed.
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
                <td style="padding:8px 12px;background:#f4f7f4;font-size:13px;color:#555;font-weight:600;">Session</td>
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

/**
 * Frees a slot held by an abandoned checkout (pending_payment older than the hold).
 * The stale PaymentIntent is cancelled first so a late payment cannot book the slot
 * a second time; if Stripe says it was in fact paid, the slot is NOT released.
 * Returns false when the slot must be treated as taken.
 */
async function releaseStaleHolds(mentorId: string, slotDate: string, slotTime: string): Promise<boolean> {
  const { data: stale } = await supabaseAdmin
    .from('career_bookings')
    .select('id, stripe_payment_intent_id')
    .eq('mentor_id', mentorId)
    .eq('slot_date', slotDate)
    .eq('slot_time', slotTime)
    .eq('status', 'pending_payment')
    .lt('created_at', pendingHoldCutoffIso())

  for (const b of stale ?? []) {
    if (b.stripe_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(b.stripe_payment_intent_id)
      } catch {
        const pi = await stripe.paymentIntents.retrieve(b.stripe_payment_intent_id).catch(() => null)
        if (!pi || pi.status !== 'canceled') return false // paid (or unknown): the webhook will confirm it
      }
    }
    await supabaseAdmin.from('career_bookings').update({ status: 'cancelled' }).eq('id', b.id)
  }
  return true
}

async function sendBookingEmails(params: {
  sessionName: string
  mentorId: string
  name: string
  email: string
  slotDate: string
  slotTime: string
  motivation: string
  goal: string
  cvUrl?: string
}) {
  const confirmationHtml = buildConfirmationHtml({
    name: params.name,
    serviceName: params.sessionName,
    slotDate: params.slotDate,
    slotTime: params.slotTime,
    motivation: params.motivation,
    goal: params.goal,
  })

  const notificationHtml = buildNotificationHtml({
    name: params.name,
    email: params.email,
    serviceName: params.sessionName,
    slotDate: params.slotDate,
    slotTime: params.slotTime,
    motivation: params.motivation,
    goal: params.goal,
    cvUrl: params.cvUrl,
  })

  // Each mentor is notified at their own address.
  const { data: mentor } = await supabaseAdmin
    .from('career_mentors')
    .select('notification_email')
    .eq('id', params.mentorId)
    .single()
  const notifyEmails = mentor?.notification_email ? [mentor.notification_email] : []

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: params.email,
      subject: `Booking Confirmed – ${params.sessionName} | Alata Career Service`,
      html: confirmationHtml,
    }),
    ...notifyEmails.map(email =>
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `New Booking – ${params.sessionName}`,
        html: notificationHtml,
      })
    ),
  ])
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      mentor_id?: string
      slot_date?: string
      slot_time?: string
      name?: string
      email?: string
      motivation?: string
      goal?: string
      cv_url?: string
    }
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { mentor_id, slot_date, slot_time, name, email, motivation, goal } = body
    // Only a path generated by /api/career/upload-cv is accepted: a free-form URL
    // would end up as a link in the mentor's email.
    const cv_url = isCareerCvPath(body.cv_url) ? body.cv_url : undefined
    if (!mentor_id || !slot_date || !slot_time || !name || !email || !motivation || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: mentor } = await supabaseAdmin
      .from('career_mentors')
      .select('id, full_name')
      .eq('id', mentor_id)
      .eq('active', true)
      .maybeSingle()
    if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })

    // The slot must be one this mentor really offers, still free and in the future.
    if (!(await isSlotBookable(supabaseAdmin, mentor_id, slot_date, slot_time))) {
      return NextResponse.json({ error: 'Slot is not available' }, { status: 409 })
    }

    if (!(await releaseStaleHolds(mentor_id, slot_date, slot_time))) {
      return NextResponse.json({ error: 'Slot is fully booked' }, { status: 409 })
    }

    // Price and member status are decided here, never taken from the client.
    const pricing = await getSessionPricing(supabaseAdmin, req.headers.get('authorization'))
    const isMemberFree = pricing.is_member && !pricing.membership_inactive
    const priceCents = pricing.effective_price_cents
    const sessionName = `Career session with ${mentor.full_name}`

    if (priceCents === 0) {
      const { data: booking, error: insertErr } = await supabaseAdmin
        .from('career_bookings')
        .insert({
          mentor_id,
          slot_date,
          slot_time,
          name,
          email,
          motivation,
          goal,
          cv_url: cv_url ?? null,
          status: 'confirmed',
          is_member_free: isMemberFree,
        })
        .select('id')
        .single()

      if (insertErr || !booking) {
        // Raised by the career_bookings_enforce_capacity DB trigger
        if (insertErr?.message.includes('slot_full')) {
          return NextResponse.json({ error: 'Slot is fully booked' }, { status: 409 })
        }
        return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
      }

      try {
        await sendBookingEmails({
          sessionName,
          mentorId: mentor_id,
          name,
          email,
          slotDate: slot_date,
          slotTime: slot_time,
          motivation,
          goal,
          cvUrl: (await signedCvUrl(cv_url, CV_LINK_TTL_SECONDS)) ?? undefined,
        })
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
      }

      return NextResponse.json({ success: true, booking_id: booking.id })
    }

    // Paid booking — create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceCents,
      currency: 'eur',
      description: sessionName,
      metadata: {
        booking_mentor_id: mentor_id,
        service_name: sessionName,
        slot_date,
        slot_time,
        name,
        email,
        motivation,
        goal,
        cv_url: cv_url ?? '',
      },
    })

    const { data: booking, error: insertErr } = await supabaseAdmin
      .from('career_bookings')
      .insert({
        mentor_id,
        slot_date,
        slot_time,
        name,
        email,
        motivation,
        goal,
        cv_url: cv_url ?? null,
        status: 'pending_payment',
        is_member_free: false,
        stripe_payment_intent_id: paymentIntent.id,
      })
      .select('id')
      .single()

    if (insertErr || !booking) {
      // The slot was lost: do not leave a payable PaymentIntent behind.
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => {})
      // Raised by the career_bookings_enforce_capacity DB trigger
      if (insertErr?.message.includes('slot_full')) {
        return NextResponse.json({ error: 'Slot is fully booked' }, { status: 409 })
      }
      return NextResponse.json({ error: insertErr?.message ?? 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      booking_id: booking.id,
      amount_cents: priceCents,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
