import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import QRCode from 'qrcode'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function buildQrHtml(nome: string, eventTitle: string, registrationId: string): Promise<string> {
  const checkinUrl = `https://alatainvestmentclub.com/checkin?token=${registrationId}`
  const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 300, margin: 2 })

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border:1px solid #e5e5e5;overflow:hidden;">
        <tr>
          <td style="background:#1a4a3a;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#a8c5b8;letter-spacing:2px;text-transform:uppercase;">Alata Investment Club</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">${eventTitle}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 8px;">
            <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.6;">Ciao ${nome},</p>
            <p style="margin:12px 0 0;font-size:15px;color:#1a1a1a;line-height:1.6;">
              Ecco il tuo QR code personale per accedere all'evento. Presentalo all'ingresso.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;">
            <p style="margin:16px 0 12px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#1a4a3a;">Your Check-In QR Code</p>
            <div style="text-align:center;padding:20px;border:1px solid #e5e5e5;">
              <img src="${qrDataUrl}" width="250" height="250" alt="QR Code" style="display:block;margin:0 auto;" />
            </div>
            <p style="margin:12px 0 0;font-size:12px;color:#888;text-align:center;">Present this QR code at the event entrance</p>
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.email !== 'finullistefano@gmail.com') {
    const { data: member } = await supabaseAdmin
      .from('club_members')
      .select('role')
      .eq('email', user.email!)
      .maybeSingle()
    if (member?.role !== 'bod' && member?.role !== 'director') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  let body: { registration_ids?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { registration_ids } = body
  if (!registration_ids?.length) {
    return NextResponse.json({ error: 'Missing registration_ids' }, { status: 400 })
  }

  let sent = 0
  let failed = 0

  for (const id of registration_ids) {
    try {
      const { data: reg } = await supabaseAdmin
        .from('event_registrations')
        .select('nome, email, event_id')
        .eq('id', id)
        .single()

      if (!reg) { failed++; continue }

      const { data: event } = await supabaseAdmin
        .from('upcoming_events')
        .select('title')
        .eq('id', reg.event_id)
        .single()

      const eventTitle = event?.title ?? 'Event'
      const html = await buildQrHtml(reg.nome, eventTitle, id)

      const { error } = await resend.emails.send({
        from: FROM,
        to: reg.email,
        subject: `Your QR Code — ${eventTitle}`,
        html,
      })

      if (error) failed++
      else sent++
    } catch {
      failed++
    }
    await sleep(300)
  }

  return NextResponse.json({ sent, failed })
}
