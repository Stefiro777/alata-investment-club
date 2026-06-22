import { createClient } from '@/lib/supabase-server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabaseAdmin
    .from('club_members')
    .select('role')
    .eq('email', user.email!)
    .maybeSingle()
  if (member?.role !== 'bod' && member?.role !== 'director' && user.email !== 'finullistefano@gmail.com') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { event_id?: string; subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event_id, subject, message } = body
  if (!event_id || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing event_id, subject, or message' }, { status: 400 })
  }

  const { data: registrations, error: regErr } = await supabaseAdmin
    .from('event_registrations')
    .select('nome, email')
    .eq('event_id', event_id)

  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 })
  if (!registrations || registrations.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  let sent = 0
  let failed = 0

  for (const reg of registrations) {
    const personalizedMessage = message.replace(/\[Nome\]/g, reg.nome ?? '')
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: reg.email,
        subject: subject.trim(),
        html: `<!DOCTYPE html>
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
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">${subject.trim()}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0;font-size:15px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap;">${personalizedMessage}</p>
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
</html>`,
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
