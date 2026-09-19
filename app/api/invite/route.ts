import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const VALID_TEAMS = ['lab', 'events', 'media', 'alumni'] as const
const VALID_LAB_SUBDIVISIONS = ['macro_markets', 'equity_valuation', 'ma'] as const

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alatainvestmentclub.com'

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

        <!-- Notice -->
        <tr>
          <td style="padding:0 24px 24px;text-align:center;">
            <p style="font-size:12px;color:#a0a0a0;text-align:center;margin-top:16px;">
              This link does not expire. If you did not expect this invitation, please contact an administrator.
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
    const requester = await requirePrivilegedAccess()
    if (!requester) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const team = body.team
    const rawLabSubdivision = body.lab_subdivision

    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (!VALID_TEAMS.includes(team)) {
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 })
    }

    let labSubdivision: string | null = null
    if (team === 'lab') {
      if (!VALID_LAB_SUBDIVISIONS.includes(rawLabSubdivision)) {
        return NextResponse.json({ error: 'lab_subdivision required for team lab' }, { status: 400 })
      }
      labSubdivision = rawLabSubdivision
    } else if (rawLabSubdivision) {
      return NextResponse.json({ error: 'lab_subdivision must be omitted unless team is lab' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Already a registered member — nothing to invite.
    const { data: existingMember } = await supabaseAdmin
      .from('club_members')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingMember) {
      return NextResponse.json({ error: 'membro già registrato' }, { status: 400 })
    }

    // Reuse a pending invite for this email if one exists, instead of
    // creating a second row.
    const { data: pendingInvites, error: pendingError } = await supabaseAdmin
      .from('invites')
      .select('id, token')
      .eq('email', email)
      .is('used_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (pendingError) {
      return NextResponse.json({ error: pendingError.message }, { status: 500 })
    }

    const pendingInvite = pendingInvites?.[0] ?? null
    let token: string

    if (pendingInvite) {
      token = pendingInvite.token
      const { error: updateError } = await supabaseAdmin
        .from('invites')
        .update({ team, lab_subdivision: labSubdivision })
        .eq('id', pendingInvite.id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('invites')
        .insert({
          email,
          team,
          lab_subdivision: labSubdivision,
          invited_by: requester.user_id,
        })
        .select('token')
        .single()

      if (insertError || !inserted) {
        return NextResponse.json({ error: insertError?.message ?? 'Failed to create invite' }, { status: 500 })
      }
      token = inserted.token
    }

    const inviteLink = `${SITE_URL}/accept-invite?token=${token}`

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
