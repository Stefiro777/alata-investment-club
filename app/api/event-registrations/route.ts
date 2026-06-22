import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import QRCode from 'qrcode'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

async function buildConfirmationHtml(eventTitle: string, registrationId: string): Promise<string> {
  const checkinUrl = `https://alatainvestmentclub.com/checkin?token=${registrationId}`
  const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 220, margin: 2 })

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
            <p style="margin:0;font-size:11px;color:#a8c5b8;letter-spacing:2px;text-transform:uppercase;">Alata Investment Club</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">${eventTitle}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;line-height:1.6;">
              Thank you for registering. We have received your application and will send you all the details shortly.
            </p>
            <p style="margin:0;font-size:14px;color:#555;">The Alata Investment Club Team</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;border-top:1px solid #e5e5e5;">
            <p style="margin:24px 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1a4a3a;">Your Check-In QR Code</p>
            <div style="text-align:center;padding:20px 0;">
              <img src="${qrDataUrl}" alt="Check-in QR Code" width="220" height="220" style="display:block;margin:0 auto;" />
            </div>
            <p style="margin:8px 0 0;font-size:12px;color:#888;text-align:center;">Present this QR code at the event entrance</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f4f7f4;border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:11px;color:#888;">
              Alata Investment Club &bull; alatainvestmentclub.com
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const serviceClient = () =>
  createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

// POST /api/event-registrations — public, no auth required
export async function POST(req: NextRequest) {
  try {
    const {
      event_id,
      nome,
      cognome,
      email,
      telefono,
      anno_di_studio,
      motivazione,
      questions_for_panelists,
    } = await req.json()

    if (!event_id || !nome || !cognome || !email || !anno_di_studio || (!motivazione && !questions_for_panelists)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = serviceClient()
    const { error } = await supabase.from('event_registrations').insert({
      event_id,
      nome,
      cognome,
      email,
      telefono: telefono ?? null,
      anno_di_studio,
      motivazione: motivazione ?? null,
      questions_for_panelists: questions_for_panelists ?? null,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send confirmation email — failure must not affect the response
    try {
      const { data: eventRow } = await supabase
        .from('upcoming_events')
        .select('title')
        .eq('id', event_id)
        .single()

      const eventTitle = eventRow?.title ?? 'Event'

      const { data: reg } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', event_id)
        .eq('email', email)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      const registrationId = reg?.id ?? ''
      const html = await buildConfirmationHtml(eventTitle, registrationId)

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `Registration Confirmed — ${eventTitle}`,
        html,
      })
    } catch (emailErr) {
      console.error('Confirmation email failed:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET /api/event-registrations?event_id=... — admin only
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('email')
      .eq('email', user.email)
      .maybeSingle()
    if (!adminRow) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const event_id = req.nextUrl.searchParams.get('event_id')
    if (!event_id) {
      return NextResponse.json({ error: 'event_id required' }, { status: 400 })
    }

    const { data, error } = await serviceClient()
      .from('event_registrations')
      .select('*')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
