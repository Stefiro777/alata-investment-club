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

async function sendBookingEmails(params: {
  bookingId: string
  serviceId: string
  serviceName: string
  mentorId?: string | null
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
    serviceName: params.serviceName,
    slotDate: params.slotDate,
    slotTime: params.slotTime,
    motivation: params.motivation,
    goal: params.goal,
  })

  const notificationHtml = buildNotificationHtml({
    name: params.name,
    email: params.email,
    serviceName: params.serviceName,
    slotDate: params.slotDate,
    slotTime: params.slotTime,
    motivation: params.motivation,
    goal: params.goal,
    cvUrl: params.cvUrl,
  })

  // Mentor-scoped bookings notify the specific mentor; generic bookings keep
  // notifying the service-level contact list as before.
  let notifyEmails: string[] = []
  if (params.mentorId) {
    const { data: mentor } = await supabaseAdmin
      .from('career_mentors')
      .select('notification_email')
      .eq('id', params.mentorId)
      .single()
    if (mentor?.notification_email) notifyEmails = [mentor.notification_email]
  } else {
    const { data: contacts } = await supabaseAdmin
      .from('career_notification_contacts')
      .select('email')
      .eq('service_id', params.serviceId)
    notifyEmails = (contacts ?? []).map(c => c.email)
  }

  await Promise.allSettled([
    resend.emails.send({
      from: FROM,
      to: params.email,
      subject: `Booking Confirmed – ${params.serviceName} | Alata Career Service`,
      html: confirmationHtml,
    }),
    ...notifyEmails.map(email =>
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `New Booking – ${params.serviceName}`,
        html: notificationHtml,
      })
    ),
  ])
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      service_id?: string
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

    const { service_id, mentor_id, slot_date, slot_time, name, email, motivation, goal, cv_url } = body
    if (!service_id || !slot_date || !slot_time || !name || !email || !motivation || !goal) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if authenticated user is a club member with active membership
    let isMemberFree = false
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      if (user?.email) {
        const { data: member } = await supabaseAdmin
          .from('club_members')
          .select('id, membership_expires_at')
          .eq('email', user.email)
          .maybeSingle()
        if (member) {
          const membershipActive = member.membership_expires_at
            ? new Date(member.membership_expires_at) > new Date()
            : false
          if (membershipActive) isMemberFree = true
        }
      }
    }

    // Fetch service
    const { data: service, error: serviceErr } = await supabaseAdmin
      .from('career_services')
      .select('name, price_cents, max_bookings_per_slot')
      .eq('id', service_id)
      .single()

    if (serviceErr || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Double-check slot availability, scoped to the same mentor bucket as the
    // booking being created (mirrors the career_bookings_enforce_capacity trigger).
    let capacityQuery = supabaseAdmin
      .from('career_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', service_id)
      .eq('slot_date', slot_date)
      .eq('slot_time', slot_time)
      .neq('status', 'cancelled')
    capacityQuery = mentor_id ? capacityQuery.eq('mentor_id', mentor_id) : capacityQuery.is('mentor_id', null)
    const { count } = await capacityQuery

    if ((count ?? 0) >= (service.max_bookings_per_slot ?? 1)) {
      return NextResponse.json({ error: 'Slot is fully booked' }, { status: 409 })
    }

    const priceCents: number = service.price_cents ?? 0
    const isFree = isMemberFree || priceCents === 0

    if (isFree) {
      const { data: booking, error: insertErr } = await supabaseAdmin
        .from('career_bookings')
        .insert({
          service_id,
          mentor_id: mentor_id ?? null,
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
          bookingId: booking.id,
          serviceId: service_id,
          serviceName: service.name,
          mentorId: mentor_id,
          name,
          email,
          slotDate: slot_date,
          slotTime: slot_time,
          motivation,
          goal,
          cvUrl: cv_url,
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
      metadata: {
        booking_service_id: service_id,
        booking_mentor_id: mentor_id ?? '',
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
        service_id,
        mentor_id: mentor_id ?? null,
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
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
