'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useProfile } from './DashboardProfileContext'
import MembershipCard from '@/components/dashboard/MembershipCard'

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = {
  id: string
  name: string
  color: string | null
}

type Task = {
  id: string
  title: string
  status: string
  due_date: string | null
  category_id: string | null
  category: Category | null
  is_todo_item: boolean
  team: string | null
}

const TEAM_NAMES: Record<string, string> = {
  events:  'Events',
  media:   'Media',
  career:  'Career',
  academy: 'Academy',
  syrto:   'Syrto',
  lab:     'Lab & Research',
  alumni:  'Alumni',
}

type Comment = {
  id: string
  task_id: string
  body: string
  created_at: string
  task_title: string
  author_name: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(iso) < today
}

function isToday(iso: string | null): boolean {
  if (!iso) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d.getTime() === today.getTime()
}

function isTomorrow(iso: string | null): boolean {
  if (!iso) return false
  const tomorrow = new Date()
  tomorrow.setHours(0, 0, 0, 0)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  return d.getTime() === tomorrow.getTime()
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'adesso'
  if (mins < 60) return `${mins} min fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'ieri'
  if (days < 7) return `${days} giorni fa`
  return formatDate(iso)
}

function statusLabel(status: string): string {
  if (status === 'done') return 'Fatto'
  if (status === 'in_progress' || status === 'in progress') return 'In corso'
  return 'Todo'
}

function statusClass(status: string): string {
  if (status === 'in_progress' || status === 'in progress') {
    return 'bg-[#1a4a3a]/10 text-[#1a4a3a]'
  }
  return 'bg-ink-900/8 text-ink-500'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const due = task.due_date
  const urgent = isOverdue(due) || isToday(due)
  const dateText = due ? formatDate(due) : null

  return (
    <div
      onClick={onClick}
      className="border border-line bg-white px-5 py-4 flex flex-col gap-2 cursor-pointer hover:bg-[#f5f5f5] transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-ink-900 leading-snug flex-1">{task.title}</p>
        <span className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 flex-shrink-0 ${statusClass(task.status)}`}>
          {statusLabel(task.status)}
        </span>
      </div>

      {/* Source badge */}
      {task.is_todo_item ? (
        <span className="self-start text-xs font-medium uppercase tracking-wide px-2 py-0.5 bg-[#374151] text-white">
          To Do
        </span>
      ) : task.team ? (
        <span className="self-start text-xs font-medium uppercase tracking-wide px-2 py-0.5 bg-[#1a4a3a] text-white">
          {TEAM_NAMES[task.team] ?? task.team}
        </span>
      ) : null}

      <div className="flex items-center gap-3 flex-wrap">
        {task.category && (
          <span
            className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5"
            style={{
              backgroundColor: task.category.color ? `${task.category.color}22` : '#1a4a3a22',
              color: task.category.color ?? '#1a4a3a',
            }}
          >
            {task.category.name}
          </span>
        )}
        {dateText && (
          <span className={`text-[11px] ${urgent ? 'text-red-500 font-semibold' : 'text-ink-400'}`}>
            {urgent && isOverdue(due) && !isToday(due) ? '⚠ ' : ''}{dateText}
          </span>
        )}
      </div>
    </div>
  )
}

function CommentCard({ comment }: { comment: Comment }) {
  const preview = comment.body.length > 80 ? comment.body.slice(0, 80) + '…' : comment.body

  return (
    <div className="border border-line bg-white px-5 py-4 flex flex-col gap-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400 truncate">
        {comment.task_title}
      </p>
      <p className="text-sm text-ink-900 leading-snug">{preview}</p>
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-[11px] text-ink-500">{comment.author_name}</span>
        <span className="text-[11px] text-ink-400">{relativeTime(comment.created_at)}</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const profile      = useProfile()
  const router       = useRouter()
  const searchParams = useSearchParams()
  const membershipExpiredBanner = searchParams.get('membership') === 'expired'

  const [tasks, setTasks] = useState<Task[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!profile) return

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const uid = user.id

      // Tasks assigned to this user, not done
      const { data: taskRows } = await supabase
        .from('tasks')
        .select('id, title, status, due_date, category_id, is_todo_item, team, task_categories(id, name, color)')
        .contains('assigned_to', [uid])
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })

      const parsedTasks: Task[] = (taskRows ?? [])
        // Keep only: todo items OR tasks belonging to a team (exclude orphans)
        .filter((r: Record<string, unknown>) =>
          r.is_todo_item === true || (r.team !== null && r.team !== undefined)
        )
        .map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: r.title as string,
          status: r.status as string,
          due_date: r.due_date as string | null,
          category_id: r.category_id as string | null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          category: r.task_categories ? (r.task_categories as any) : null,
          is_todo_item: r.is_todo_item === true,
          team: (r.team as string) ?? null,
        }))

      setTasks(parsedTasks)

      // Recent comments on tasks assigned to this user
      // Step 1: get all task ids where user is assigned
      const { data: myTasks } = await supabase
        .from('tasks')
        .select('id, title')
        .contains('assigned_to', [uid])

      const taskIds = (myTasks ?? []).map((t: Record<string, unknown>) => t.id as string)

      let parsedComments: Comment[] = []
      if (taskIds.length > 0) {
        // Step 2: fetch latest comments on those tasks
        const { data: commentRows } = await supabase
          .from('task_comments')
          .select('id, content, created_at, task_id, author_id')
          .in('task_id', taskIds)
          .order('created_at', { ascending: false })
          .limit(5)

        const rows = commentRows ?? []

        // Step 3: resolve author names
        const authorIds = [...new Set(
          rows.map((r: Record<string, unknown>) => r.author_id).filter(Boolean)
        )] as string[]
        let nameMap: Record<string, string> = {}
        if (authorIds.length) {
          const { data: members } = await supabase
            .from('club_members')
            .select('user_id, full_name')
            .in('user_id', authorIds)
          ;(members ?? []).forEach((m: Record<string, unknown>) => {
            if (m.user_id) nameMap[m.user_id as string] = m.full_name as string
          })
        }

        // Build task title map
        const titleMap: Record<string, string> = {}
        ;(myTasks ?? []).forEach((t: Record<string, unknown>) => {
          titleMap[t.id as string] = t.title as string
        })

        parsedComments = rows.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          task_id: r.task_id as string,
          body: (r.content as string) ?? '',
          created_at: r.created_at as string,
          task_title: titleMap[r.task_id as string] ?? '',
          author_name: r.author_id ? (nameMap[r.author_id as string] ?? 'Membro') : 'Membro',
        }))
      }

      setComments(parsedComments)
      setLoading(false)
    }

    load()
  }, [profile])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-sm text-ink-500">
        Caricamento...
      </div>
    )
  }

  const urgentCount = tasks.filter(t => isToday(t.due_date) || isTomorrow(t.due_date)).length

  const memberSince = profile?.created_at ? String(new Date(profile.created_at).getFullYear()) : null

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-8">

      {/* Membership expired banner */}
      {membershipExpiredBanner && (
        <div className="border border-red-300 bg-red-50 px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
            La tua membership è scaduta — Rinnova per accedere a tutte le funzionalità
          </p>
          <Link
            href="/dashboard/membership"
            className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[#1a4a3a] underline"
          >
            Rinnova →
          </Link>
        </div>
      )}

      {/* Banner scadenze */}
      {urgentCount > 0 && (
        <div className="bg-[#1a4a3a] text-white px-5 py-3 text-sm font-medium">
          Hai {urgentCount} task in scadenza oggi o domani
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Le mie task (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-serif text-2xl font-semibold text-ink-900">Le mie task</h2>
          <div className="w-8 h-px bg-forest" />
          {tasks.length === 0 ? (
            <p className="text-sm text-ink-500 pt-2">Nessuna task assegnata al momento.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => {
                    if (task.team) router.push(`/dashboard/team/${task.team}`)
                    else if (task.is_todo_item) router.push('/dashboard/todo')
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Commenti recenti (1/3) */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl font-semibold text-ink-900">Commenti recenti</h2>
          <div className="w-8 h-px bg-forest" />
          {comments.length === 0 ? (
            <p className="text-sm text-ink-500 pt-2">Nessun commento recente.</p>
          ) : (
            <div className="space-y-3">
              {comments.map(c => <CommentCard key={c.id} comment={c} />)}
            </div>
          )}
        </div>

      </div>

      {/* Membership Card — bottom */}
      <div>
        <h2 className="font-serif text-2xl font-semibold text-ink-900 mb-1">La tua Membership Card</h2>
        <div className="w-8 h-px bg-forest mb-5" />
        <MembershipCard
          name={profile?.full_name ?? ''}
          role={profile?.role ?? ''}
          memberId={profile?.member_id ?? null}
          memberSince={memberSince}
          expiresAt={profile?.membership_expires_at ?? null}
        />
      </div>

    </div>
  )
}
