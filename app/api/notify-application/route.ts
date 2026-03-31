import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const NOTIFY_TO = 'alatabrixiaic@gmail.com'
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

interface ApplicationRecord {
  id?: string | number
  first_name?: string
  last_name?: string
  email?: string
  year_of_study?: string
  degree_programme?: string
  motivation?: string
  created_at?: string
  [key: string]: unknown
}

function buildHtml(record: ApplicationRecord): string {
  const fields: [string, string][] = [
    ['Nome', record.first_name ?? '—'],
    ['Cognome', record.last_name ?? '—'],
    ['Email', record.email ?? '—'],
    ['Anno di studio', record.year_of_study ?? '—'],
    ['Corso di laurea', record.degree_programme ?? '—'],
    ['Motivazione', record.motivation ?? '—'],
    ['Data candidatura', record.created_at ? new Date(record.created_at).toLocaleString('it-IT') : '—'],
    ['ID', String(record.id ?? '—')],
  ]

  const rows = fields
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 16px;background:#f4f7f4;font-weight:600;font-size:13px;
                   color:#1a4a3a;white-space:nowrap;border-bottom:1px solid #e5e5e5;
                   vertical-align:top;width:160px;">${label}</td>
        <td style="padding:10px 16px;font-size:13px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;
                   vertical-align:top;white-space:pre-wrap;">${value}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#fff;border:1px solid #e5e5e5;border-radius:4px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td colspan="2" style="background:#1a4a3a;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#a8c5b8;letter-spacing:2px;
                      text-transform:uppercase;">Alata Investment Club</p>
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">
              Nuova Candidatura
            </h1>
          </td>
        </tr>

        <!-- Fields -->
        <tr>
          <td colspan="2" style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">${rows}
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td colspan="2" style="padding:20px 32px;background:#f4f7f4;
                                  border-top:1px solid #e5e5e5;">
            <p style="margin:0;font-size:11px;color:#888;">
              Notifica automatica — Alata Investment Club &bull; alatainvestmentclub.com
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (!secret || secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { record?: ApplicationRecord }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const record = body.record
  if (!record) {
    return NextResponse.json({ error: 'Missing record field' }, { status: 400 })
  }

  const subject = `Nuova Candidatura — ${record.first_name ?? ''} ${record.last_name ?? ''}`.trim()

  const { error } = await resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject,
    html: buildHtml(record),
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
