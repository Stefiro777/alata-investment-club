import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { FALLBACK_APPLICATION_EMAIL, signedCvUrl } from '@/lib/job-applications'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'
const BASE_URL = 'https://alatainvestmentclub.com'

// An application can only be notified shortly after it was submitted, and
// only once (notified_at is claimed atomically below).
const NOTIFY_WINDOW_MS = 15 * 60 * 1000
const CV_LINK_TTL_SECONDS = 7 * 24 * 60 * 60

function esc(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value: string, shaded: boolean): string {
  const bg = shaded ? 'background:#f4f7f4;' : ''
  return `<tr>
    <td style="padding:8px 12px;${bg}font-size:13px;color:#555;width:32%;font-weight:600;">${label}</td>
    <td style="padding:8px 12px;${bg}font-size:13px;color:#1a1a1a;">${value}</td>
  </tr>`
}

function buildHtml(p: {
  jobTitle: string
  name: string
  email: string
  phone: string | null
  linkedin: string | null
  coverLetter: string | null
  cvLink: string | null
  cvFilename: string | null
}): string {
  const rows = [
    row('Candidato', esc(p.name), true),
    row('Email', `<a href="mailto:${esc(p.email)}" style="color:#1a4a3a;">${esc(p.email)}</a>`, false),
    row('Telefono', esc(p.phone) || '—', true),
    row('LinkedIn', p.linkedin ? `<a href="${esc(p.linkedin)}" style="color:#1a4a3a;">${esc(p.linkedin)}</a>` : '—', false),
    row('CV', p.cvLink ? `<a href="${esc(p.cvLink)}" style="color:#1a4a3a;">${esc(p.cvFilename) || 'Scarica CV'}</a> (link valido 7 giorni)` : '—', true),
    row('Lettera', p.coverLetter ? `<span style="white-space:pre-wrap;">${esc(p.coverLetter)}</span>` : '—', false),
  ].join('')

  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;">
        <tr>
          <td style="background:#1a4a3a;padding:28px 32px;">
            <p style="margin:0 0 6px;font-size:11px;color:#7ecba3;letter-spacing:2px;text-transform:uppercase;">Alata Investment Club</p>
            <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:700;">Nuova candidatura</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 24px 8px;font-size:14px;color:#374151;line-height:1.6;">
            Hai ricevuto una nuova candidatura per <strong>${esc(p.jobTitle)}</strong>.
          </td>
        </tr>
        <tr><td style="padding:8px 24px 0;"><table width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
        <tr>
          <td style="padding:24px;text-align:center;">
            <a href="${BASE_URL}/dashboard/jobs"
               style="display:inline-block;background:#1a4a3a;color:#ffffff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;padding:12px 28px;text-decoration:none;">
              Gestisci le candidature
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">Notifica automatica · Alata Investment Club · alatainvestmentclub.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

/**
 * Notifies the offer's application email about a new application.
 *
 * Not an open relay: the caller only supplies an application id; the
 * recipient (job_offers.application_email, falling back to info@) and all
 * content come from the database, the application must be recent, and
 * notified_at is claimed atomically so each application triggers at most one
 * email. Requires a logged-in session.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let applicationId: unknown
  try {
    applicationId = (await req.json())?.applicationId
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (typeof applicationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
    return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: app } = await service
    .from('job_applications')
    .select('id, job_offer_id, job_title, first_name, last_name, email, phone, linkedin_url, cover_letter, cv_url, cv_filename, submitted_at')
    .eq('id', applicationId)
    .maybeSingle()
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (Date.now() - new Date(app.submitted_at).getTime() > NOTIFY_WINDOW_MS) {
    return NextResponse.json({ error: 'Application too old to notify' }, { status: 410 })
  }

  // Claim: only one caller can flip notified_at from NULL.
  const { data: claimed } = await service
    .from('job_applications')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', app.id)
    .is('notified_at', null)
    .select('id')
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ sent: false, reason: 'already_notified' })
  }

  const { data: offer } = await service
    .from('job_offers')
    .select('application_email')
    .eq('id', app.job_offer_id)
    .maybeSingle()
  const to = offer?.application_email?.trim() || FALLBACK_APPLICATION_EMAIL

  const cvLink = await signedCvUrl(app.cv_url, CV_LINK_TTL_SECONDS)

  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to,
    replyTo: app.email,
    subject: `Nuova candidatura — ${app.job_title}`,
    html: buildHtml({
      jobTitle: app.job_title,
      name: `${app.first_name} ${app.last_name}`.trim(),
      email: app.email,
      phone: app.phone,
      linkedin: app.linkedin_url,
      coverLetter: app.cover_letter,
      cvLink,
      cvFilename: app.cv_filename,
    }),
  })

  if (sendErr) {
    console.error('[jobs/applications/notify] Resend error:', sendErr)
    // Release the claim so a retry is possible.
    await service.from('job_applications').update({ notified_at: null }).eq('id', app.id)
    return NextResponse.json({ error: 'Email not sent' }, { status: 502 })
  }

  return NextResponse.json({ sent: true })
}
