import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = 'Alata Investment Club <noreply@alatainvestmentclub.com>'
const BASE_URL = 'https://alatainvestmentclub.com'

function serviceClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function priorityLabel(p: string): string {
  if (p === 'high')   return 'High 🔴'
  if (p === 'low')    return 'Low ⚪'
  return 'Medium 🟠'
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

function teamLabel(t: string | null): string {
  if (!t) return '—'
  const map: Record<string, string> = {
    events: 'Events', media: 'Media', career: 'Career',
    academy: 'Academy', syrto: 'Syrto', lab: 'Lab & Research', alumni: 'Alumni',
  }
  return map[t] ?? t
}

function buildTaskEmail({
  recipientName,
  taskTitle,
  taskDescription,
  priority,
  dueDate,
  team,
  creatorName,
  taskLink,
  isReminder,
}: {
  recipientName: string
  taskTitle: string
  taskDescription: string | null
  priority: string
  dueDate: string | null
  team: string | null
  creatorName: string
  taskLink: string
  isReminder: boolean
}): string {
  const headerTitle = isReminder
    ? 'Reminder: task in scadenza domani'
    : 'Nuova task assegnata'

  const intro = isReminder
    ? `Ciao ${recipientName}, ti ricordiamo che la seguente task scade <strong>domani</strong>.`
    : `Ciao ${recipientName}, ti è stata assegnata una nuova task da <strong>${creatorName}</strong>.`

  const descHtml = taskDescription
    ? `<tr>
        <td style="padding:10px 24px 0;font-size:12px;font-weight:600;color:#6b7280;
                   text-transform:uppercase;letter-spacing:1px;">Descrizione</td>
      </tr>
      <tr>
        <td style="padding:6px 24px 16px;font-size:14px;color:#374151;line-height:1.6;
                   white-space:pre-wrap;">${taskDescription}</td>
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
                       letter-spacing:-0.3px;">${headerTitle}</h1>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:24px 24px 0;font-size:14px;color:#374151;line-height:1.6;">
            ${intro}
          </td>
        </tr>

        <!-- Task title -->
        <tr>
          <td style="padding:20px 24px 0;">
            <div style="border-left:3px solid #1a4a3a;padding:12px 16px;background:#f9fafb;">
              <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">
                ${taskTitle}
              </p>
            </div>
          </td>
        </tr>

        ${descHtml}

        <!-- Meta grid -->
        <tr>
          <td style="padding:20px 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;width:50%;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Priorità</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${priorityLabel(priority)}</p>
                </td>
                <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Scadenza</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${fmtDate(dueDate)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-right:1px solid #e5e7eb;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Team</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${teamLabel(team)}</p>
                </td>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Creata da</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${creatorName}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:24px 24px 28px;text-align:center;">
            <a href="${taskLink}"
               style="display:inline-block;background:#1a4a3a;color:#ffffff;
                      font-size:13px;font-weight:600;text-transform:uppercase;
                      letter-spacing:1px;padding:12px 28px;text-decoration:none;">
              Vedi task →
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
  let taskId: string
  try {
    const body = await req.json()
    taskId = body?.taskId
    if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = serviceClient()

  // 1. Fetch task
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, priority, team, assigned_to, created_by')
    .eq('id', taskId)
    .single()

  if (taskErr || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  const assignedTo: string[] = task.assigned_to ?? []
  if (assignedTo.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 2. Fetch assignees with email
  console.log('assignedTo array:', assignedTo)
  const { data: assignees, error: assigneesErr } = await supabase
    .from('club_members')
    .select('user_id, full_name, email')
    .in('user_id', assignedTo)
    .not('email', 'is', null)
  console.log('assignees query error:', assigneesErr)
  console.log('assignees found:', assignees)

  // 3. Fetch creator name
  let creatorName = 'Alata'
  if (task.created_by) {
    const { data: creator } = await supabase
      .from('club_members')
      .select('full_name')
      .eq('user_id', task.created_by)
      .maybeSingle()
    if (creator?.full_name) creatorName = creator.full_name
  }

  const taskLink = task.team
    ? `${BASE_URL}/dashboard/team/${task.team}`
    : `${BASE_URL}/dashboard`

  // 4. Send emails — fire each independently, don't let one failure block others
  let sent = 0
  for (const member of (assignees ?? [])) {
    if (!member.email) continue
    try {
      await resend.emails.send({
        from: FROM,
        to: member.email,
        subject: `Nuova task assegnata: ${task.title}`,
        html: buildTaskEmail({
          recipientName: member.full_name ?? 'Membro',
          taskTitle: task.title,
          taskDescription: task.description ?? null,
          priority: task.priority ?? 'medium',
          dueDate: task.due_date ?? null,
          team: task.team ?? null,
          creatorName,
          taskLink,
          isReminder: false,
        }),
      })
      sent++
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (err) {
      console.error(`Failed to send notification to ${member.email}:`, err)
    }
  }

  return NextResponse.json({ sent })
}
