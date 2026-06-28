import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

// ── Order email ────────────────────────────────────────────────────────────────

type OrderItem = {
  name:         string
  variantColor?: string | null
  size?:         string | null
  quantity:      number
  priceCents:    number
}

type OrderPayload = {
  type:            'order'
  customerEmail:   string
  customerName:    string
  items:           OrderItem[]
  totalCents:      number
  shippingCents?:  number
  shippingAddress?: {
    firstName: string; lastName: string
    addressLine1: string; addressLine2?: string
    city: string; postalCode: string; country: string
  } | null
}

function buildOrderHtml(p: OrderPayload): string {
  const firstName = p.customerName.trim().split(' ')[0] || p.customerName

  const itemRows = p.items.map(i => {
    const desc = [i.name, i.variantColor, i.size].filter(Boolean).join(' / ')
    return `
      <tr>
        <td style="padding:10px 12px;font-size:14px;color:#1a1a1a;border-bottom:1px solid #e5e5e5;">
          ${desc}${i.quantity > 1 ? ` ×${i.quantity}` : ''}
        </td>
        <td style="padding:10px 12px;font-size:14px;color:#1a1a1a;text-align:right;border-bottom:1px solid #e5e5e5;white-space:nowrap;">
          €${((i.priceCents * i.quantity) / 100).toFixed(2).replace('.', ',')}
        </td>
      </tr>`
  }).join('')

  const shippingRow = p.shippingCents && p.shippingCents > 0 ? `
      <tr>
        <td style="padding:10px 12px;font-size:14px;color:#555;border-bottom:1px solid #e5e5e5;">Shipping</td>
        <td style="padding:10px 12px;font-size:14px;color:#555;text-align:right;border-bottom:1px solid #e5e5e5;">
          €${(p.shippingCents / 100).toFixed(2).replace('.', ',')}
        </td>
      </tr>` : ''

  const totalRow = `
      <tr>
        <td style="padding:12px;font-size:14px;font-weight:700;color:#1a1a1a;">Total</td>
        <td style="padding:12px;font-size:14px;font-weight:700;color:#1a4a3a;text-align:right;">
          €${(p.totalCents / 100).toFixed(2).replace('.', ',')}
        </td>
      </tr>`

  const addr = p.shippingAddress
  const addressBlock = addr ? `
            <p style="margin:16px 0 6px;font-size:11px;font-weight:700;color:#555;
                       text-transform:uppercase;letter-spacing:1px;">Shipping address</p>
            <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.6;">
              ${addr.firstName} ${addr.lastName}<br/>
              ${addr.addressLine1}${addr.addressLine2 ? ', ' + addr.addressLine2 : ''}<br/>
              ${addr.postalCode} ${addr.city}, ${addr.country}
            </p>` : ''

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
            <h1 style="margin:6px 0 0;font-size:20px;color:#ffffff;font-weight:700;">Order Confirmed</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#1a1a1a;line-height:1.6;">
              Hi ${firstName}, thank you for your order!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e5e5;margin-bottom:20px;">
              <tr>
                <td style="padding:10px 12px;background:#f4f7f4;font-size:11px;font-weight:700;
                            color:#555;text-transform:uppercase;letter-spacing:1px;">Item</td>
                <td style="padding:10px 12px;background:#f4f7f4;font-size:11px;font-weight:700;
                            color:#555;text-transform:uppercase;letter-spacing:1px;text-align:right;">Price</td>
              </tr>
              ${itemRows}
              ${shippingRow}
              ${totalRow}
            </table>
            ${addressBlock}
            <p style="margin:20px 0 0;font-size:14px;color:#555;line-height:1.6;">
              We will contact you with shipping details shortly.<br/>
              The Alata Investment Club Team
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

// ── Registration email ─────────────────────────────────────────────────────────

type RegistrationEvent = {
  name:      string
  eventDate?: string | null
  location?:  string | null
}

type RegistrationPayload = {
  type:          'registration'
  customerEmail: string
  customerName:  string
  events:        RegistrationEvent[]
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function buildRegistrationHtml(p: RegistrationPayload): string {
  const firstName = p.customerName.trim().split(' ')[0] || p.customerName

  const eventRows = p.events.map(e => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #e5e5e5;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#1a1a1a;">${e.name}</p>
            ${e.eventDate ? `<p style="margin:4px 0 0;font-size:13px;color:#555;">${fmtDate(e.eventDate)}</p>` : ''}
            ${e.location  ? `<p style="margin:2px 0 0;font-size:13px;color:#555;">${e.location}</p>` : ''}
          </td>
        </tr>`).join('')

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
              Hi ${firstName}, your registration is confirmed!
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e5e5;margin-bottom:20px;">
              ${eventRows}
            </table>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.6;">
              We will send you all the details shortly. See you soon!<br/>
              The Alata Investment Club Team
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

// ── Route ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as OrderPayload | RegistrationPayload

    if (!body.customerEmail || !body.customerName) {
      return NextResponse.json({ error: 'Missing customerEmail or customerName' }, { status: 400 })
    }

    if (body.type === 'order') {
      await resend.emails.send({
        from:    FROM,
        to:      body.customerEmail,
        subject: 'Order Confirmed — Alata Investment Club',
        html:    buildOrderHtml(body),
      })
    } else if (body.type === 'registration') {
      const eventName = body.events[0]?.name ?? 'Event'
      const subject = body.events.length === 1
        ? `Registration Confirmed — ${eventName}`
        : 'Registration Confirmed — Alata Investment Club'
      await resend.emails.send({
        from:    FROM,
        to:      body.customerEmail,
        subject,
        html:    buildRegistrationHtml(body),
      })
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    console.error('send-confirmation error:', e)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
