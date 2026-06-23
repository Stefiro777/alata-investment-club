import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM     = 'Alata Investment Club <noreply@alatainvestmentclub.com>'
const BASE_URL = 'https://alatainvestmentclub.com'

function serviceClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function buildJobEmail({
  recipientName,
  jobTitle,
  company,
  description,
  jobLink,
}: {
  recipientName: string
  jobTitle: string
  company: string
  description: string | null
  jobLink: string
}): string {
  const descHtml = description
    ? `<tr>
        <td style="padding:10px 24px 0;font-size:12px;font-weight:600;color:#6b7280;
                   text-transform:uppercase;letter-spacing:1px;">Descrizione</td>
      </tr>
      <tr>
        <td style="padding:6px 24px 16px;font-size:14px;color:#374151;line-height:1.6;
                   white-space:pre-wrap;">${description}</td>
      </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="it">
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
                       letter-spacing:-0.3px;">Nuova offerta di lavoro</h1>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:24px 24px 0;font-size:14px;color:#374151;line-height:1.6;">
            Ciao ${recipientName}, è stata pubblicata una nuova offerta di lavoro nel club.
          </td>
        </tr>

        <!-- Job title -->
        <tr>
          <td style="padding:20px 24px 0;">
            <div style="border-left:3px solid #1a4a3a;padding:12px 16px;background:#f9fafb;">
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${jobTitle}</p>
            </div>
          </td>
        </tr>

        ${descHtml}

        <!-- Meta -->
        <tr>
          <td style="padding:20px 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Azienda</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${company}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 24px 28px;text-align:center;">
            <a href="${jobLink}"
               style="display:inline-block;background:#1a4a3a;color:#ffffff;
                      font-size:13px;font-weight:600;text-transform:uppercase;
                      letter-spacing:1px;padding:12px 28px;text-decoration:none;">
              Vedi offerta →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
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

export async function POST(req: NextRequest) {
  let jobId: string
  try {
    const body = await req.json()
    jobId = body?.jobId
    if (!jobId) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = serviceClient()

  // 1. Fetch job offer
  const { data: job, error: jobErr } = await supabase
    .from('job_offers')
    .select('id, title, company, link, description')
    .eq('id', jobId)
    .single()

  if (jobErr || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // 2. Fetch all subscribers
  const { data: subscribers } = await supabase
    .from('job_offer_subscriptions')
    .select('user_id')
    .eq('subscribed', true)

  const subList = subscribers ?? []
  if (subList.length === 0) return NextResponse.json({ sent: 0 })

  // 3. Fetch member emails
  const userIds = subList.map((s: { user_id: string }) => s.user_id)
  const { data: members } = await supabase
    .from('club_members')
    .select('user_id, full_name, email')
    .in('user_id', userIds)
    .not('email', 'is', null)

  const memberMap: Record<string, { full_name: string; email: string }> = {}
  for (const m of (members ?? [])) {
    if (m.user_id && m.email) memberMap[m.user_id] = { full_name: m.full_name ?? 'Membro', email: m.email }
  }

  const jobLink = `${BASE_URL}/dashboard/jobs`
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // 4. Send emails — fire each independently with delay to avoid rate limiting
  let sent = 0
  for (const sub of subList) {
    const member = memberMap[(sub as { user_id: string }).user_id]
    if (!member) continue
    try {
      await resend.emails.send({
        from: FROM,
        to: member.email,
        subject: `Nuova offerta: ${job.title} — ${job.company}`,
        html: buildJobEmail({
          recipientName: member.full_name,
          jobTitle: job.title,
          company: job.company,
          description: job.description ?? null,
          jobLink,
        }),
      })
      sent++
    } catch (err) {
      console.error(`Failed to send job notification to ${member.email}:`, err)
    }
    await delay(500)
  }

  return NextResponse.json({ sent })
}
