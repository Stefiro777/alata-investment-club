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
  if (p === 'high') return 'High 🔴'
  if (p === 'low')  return 'Low ⚪'
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

function buildReminderEmail({
  recipientName,
  taskTitle,
  priority,
  dueDate,
  team,
  taskLink,
}: {
  recipientName: string
  taskTitle: string
  priority: string
  dueDate: string | null
  team: string | null
  taskLink: string
}): string {
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
                       letter-spacing:-0.3px;">Reminder: task in scadenza domani</h1>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:24px 24px 0;font-size:14px;color:#374151;line-height:1.6;">
            Ciao ${recipientName}, la seguente task scade <strong>domani</strong>.
            Assicurati di completarla in tempo!
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

        <!-- Meta -->
        <tr>
          <td style="padding:20px 24px 0;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="border:1px solid #e5e7eb;">
              <tr>
                <td style="padding:12px 16px;border-right:1px solid #e5e7eb;width:50%;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Priorità</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${priorityLabel(priority)}</p>
                </td>
                <td style="padding:12px 16px;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Scadenza</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#b91c1c;">${fmtDate(dueDate)}</p>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:12px 16px;border-top:1px solid #e5e7eb;">
                  <p style="margin:0 0 3px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">Team</p>
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111827;">${teamLabel(team)}</p>
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

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = serviceClient()

  // Tasks due tomorrow, not done
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10) // YYYY-MM-DD

  const { data: tasks, error: tasksErr } = await supabase
    .from('tasks')
    .select('id, title, due_date, priority, team, assigned_to')
    .eq('due_date', tomorrowStr)
    .neq('status', 'done')

  if (tasksErr) {
    console.error('task-reminders cron error fetching tasks:', tasksErr)
    return NextResponse.json({ error: tasksErr.message }, { status: 500 })
  }

  const taskList = tasks ?? []
  if (taskList.length === 0) {
    return NextResponse.json({ sent: 0, tasks: 0 })
  }

  // Collect all unique assignee uids across all tasks
  const allUids = [...new Set(
    taskList.flatMap((t: Record<string, unknown>) => (t.assigned_to as string[]) ?? [])
  )]

  const { data: members } = await supabase
    .from('club_members')
    .select('user_id, full_name, email')
    .in('user_id', allUids)
    .not('email', 'is', null)

  const memberMap: Record<string, { full_name: string; email: string }> = {}
  for (const m of (members ?? [])) {
    if (m.user_id && m.email) {
      memberMap[m.user_id] = { full_name: m.full_name ?? 'Membro', email: m.email }
    }
  }

  let sent = 0
  for (const task of taskList) {
    const assignedTo: string[] = (task as Record<string, unknown>).assigned_to as string[] ?? []
    const taskLink = (task as Record<string, unknown>).team
      ? `${BASE_URL}/dashboard/team/${(task as Record<string, unknown>).team}`
      : `${BASE_URL}/dashboard`

    for (const uid of assignedTo) {
      const member = memberMap[uid]
      if (!member) continue
      try {
        await resend.emails.send({
          from: FROM,
          to: member.email,
          subject: `Reminder: ${(task as Record<string, unknown>).title} scade domani`,
          html: buildReminderEmail({
            recipientName: member.full_name,
            taskTitle: (task as Record<string, unknown>).title as string,
            priority: ((task as Record<string, unknown>).priority as string) ?? 'medium',
            dueDate: ((task as Record<string, unknown>).due_date as string) ?? null,
            team: ((task as Record<string, unknown>).team as string) ?? null,
            taskLink,
          }),
        })
        sent++
      } catch (err) {
        console.error(`Failed to send reminder to ${member.email}:`, err)
      }
    }
  }

  return NextResponse.json({ sent, tasks: taskList.length })
}
