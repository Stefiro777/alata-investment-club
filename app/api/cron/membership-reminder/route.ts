import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'Alata Investment Club <noreply@alatainvestmentclub.com>'
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'

function supabase() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function buildReminderEmail(name: string, expiresAt: string): string {
  const formatted = new Date(expiresAt).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border:1px solid #e5e7eb;overflow:hidden;">
        <tr>
          <td style="background:#1a4a3a;padding:28px 32px;">
            <p style="margin:0 0 6px;font-size:11px;color:#7ecba3;letter-spacing:2px;text-transform:uppercase;">
              Alata Investment Club
            </p>
            <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:700;letter-spacing:-0.3px;">
              La tua membership scade tra 7 giorni
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;font-size:14px;color:#374151;line-height:1.7;">
            <p style="margin:0 0 16px;">Ciao <strong>${name}</strong>,</p>
            <p style="margin:0 0 16px;">
              La tua membership Alata Investment Club scadrà il <strong>${formatted}</strong>.
              Rinnova ora per continuare ad accedere a tutti i servizi e i benefici riservati ai membri.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 32px;text-align:center;">
            <a href="${BASE_URL}/dashboard/membership"
               style="display:inline-block;background:#1a4a3a;color:#ffffff;
                      font-size:12px;font-weight:700;text-transform:uppercase;
                      letter-spacing:1.5px;padding:14px 32px;text-decoration:none;">
              RINNOVA ORA →
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Notifica automatica · Alata Investment Club · alatainvestmentclub.com
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = supabase()

  // Members expiring within the next 7 days
  const { data: members, error } = await db
    .from('club_members')
    .select('id, full_name, email, membership_expires_at')
    .gte('membership_expires_at', new Date().toISOString())
    .lte('membership_expires_at', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .not('email', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let sent = 0
  for (const m of (members ?? [])) {
    if (!m.email || !m.membership_expires_at) continue
    try {
      await resend.emails.send({
        from:    FROM,
        to:      m.email,
        subject: 'La tua membership Alata scade tra 7 giorni',
        html:    buildReminderEmail(m.full_name ?? 'Membro', m.membership_expires_at),
      })
      sent++
    } catch (err) {
      console.error('membership-reminder send error:', m.email, err)
    }
  }

  return NextResponse.json({ sent, total: (members ?? []).length })
}
