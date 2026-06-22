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

  let body: { recipients?: { email: string; name: string }[]; subject?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { recipients, subject, message } = body
  if (!recipients?.length || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Missing recipients, subject, or message' }, { status: 400 })
  }

  let sent = 0
  let failed = 0

  for (const recipient of recipients) {
    const personalizedMessage = message.replace(/\[Nome\]/g, recipient.name ?? '')
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: recipient.email,
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
