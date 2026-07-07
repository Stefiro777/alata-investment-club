import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'

function buildInviteEmail(inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1a4a3a;padding:28px 32px;">
            <p style="margin:0 0 6px;font-size:11px;color:#7ecba3;letter-spacing:2px;
                      text-transform:uppercase;">Alata Investment Club</p>
            <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:700;
                       letter-spacing:-0.3px;">You have been invited</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 24px 8px;font-size:14px;color:#374151;line-height:1.6;">
            You have been invited to join the internal platform of
            <strong>Alata Investment Club</strong>.<br><br>
            Click the button below to set your password and activate your account.
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 24px 12px;text-align:center;">
            <a href="${inviteLink}"
               style="display:inline-block;background:#1a4a3a;color:#ffffff;
                      font-size:13px;font-weight:600;text-transform:uppercase;
                      letter-spacing:1px;padding:12px 32px;text-decoration:none;">
              Activate account →
            </a>
          </td>
        </tr>

        <!-- Expiry notice -->
        <tr>
          <td style="padding:0 24px 24px;text-align:center;">
            <p style="font-size:12px;color:#a0a0a0;text-align:center;margin-top:16px;">
              This link is valid for <strong>24 hours</strong>. If it has expired, please contact an administrator to receive a new one.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Automated notification · Alata Investment Club · alatainvestmentclub.com
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
    if (!(await requirePrivilegedAccess())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { email } = await req.json()
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generate a signed invite link with 24-hour expiry
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: 'https://alatainvestmentclub.com/accept-invite',
      },
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Supabase generateLink response:', JSON.stringify({ data, error }))
    }

    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('INVITE ERROR:', error.message)
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const inviteLink = data.properties.action_link

    // Send the invite email via Resend
    const { error: sendError } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'Invito — Alata Investment Club',
      html: buildInviteEmail(inviteLink),
    })

    if (sendError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('RESEND ERROR:', sendError)
      }
      return NextResponse.json({ error: 'Failed to send invite email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
