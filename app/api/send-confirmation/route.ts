import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

type ConfirmationItem = {
  name:  string
  type:  'ticket' | 'merch'
  price: number
}

function buildHtml(customerName: string, items: ConfirmationItem[]): string {
  const firstName = customerName.trim().split(' ')[0] || customerName

  const itemRows = items
    .map(i => `
        <tr>
          <td style="padding:8px 12px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">
            ${i.name}
          </td>
          <td style="padding:8px 12px;font-size:14px;color:#1a1a1a;text-align:right;border-bottom:1px solid #e5e5e5;">
            ${i.price === 0 ? 'Free' : `€${(i.price / 100).toFixed(2).replace('.', ',')}`}
          </td>
        </tr>`)
    .join('')

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
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">Registration Confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#1a1a1a;line-height:1.6;">
              Hi ${firstName}, your registration is confirmed.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e5e5;margin-bottom:20px;">
              <tr>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:11px;font-weight:700;
                            color:#555;text-transform:uppercase;letter-spacing:1px;">Item</td>
                <td style="padding:8px 12px;background:#f4f7f4;font-size:11px;font-weight:700;
                            color:#555;text-transform:uppercase;letter-spacing:1px;text-align:right;">Price</td>
              </tr>
              ${itemRows}
            </table>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
              See you soon,<br/>The Alata Investment Club Team
            </p>
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

export async function POST(req: NextRequest) {
  try {
    const { customerEmail, customerName, items } = await req.json() as {
      customerEmail: string
      customerName:  string
      items:         ConfirmationItem[]
    }

    if (!customerEmail || !customerName) {
      return NextResponse.json({ error: 'Missing customerEmail or customerName' }, { status: 400 })
    }

    await resend.emails.send({
      from:    FROM,
      to:      customerEmail,
      subject: 'Registration Confirmed — Alata Investment Club',
      html:    buildHtml(customerName, items ?? []),
    })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('send-confirmation error:', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
