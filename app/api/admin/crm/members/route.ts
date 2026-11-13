import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'
import { checkRoleChange, isRoleCheckViolation, roleWarnings } from '@/lib/roles'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/crm/members[?removed=1]: the active members; with removed=1 also those removed from the membership.
export async function GET(req: NextRequest) {
  if (!(await requirePrivilegedAccess())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let query = supabaseAdmin
    .from('club_members')
    .select('id, full_name, email, role, teams, lab_subdivision, title, created_at, study_level, study_year, membership_removed_at')
    .order('created_at', { ascending: false })
  if (req.nextUrl.searchParams.get('removed') !== '1') query = query.is('membership_removed_at', null)
  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// PATCH /api/admin/crm/members  { id, role }
// Changes the role only: club_members.teams is never touched (it is the source of team permissions).
// Only BoD and Management; the superadmin and the requester keep BoD / Management.
// The response carries notices (team missing, Lab subdivision empty) that never block the change.
export async function PATCH(req: NextRequest) {
  const requester = await requirePrivilegedAccess()
  if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as { id?: unknown; role?: unknown }
  if (typeof body.id !== 'string' || !body.id) {
    return NextResponse.json({ error: 'Member id required' }, { status: 400 })
  }

  const { data: target, error: targetError } = await supabaseAdmin
    .from('club_members')
    .select('id, email, role, teams, lab_subdivision')
    .eq('id', body.id)
    .maybeSingle()
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 })
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const check = checkRoleChange({
    requesterId: requester.id,
    requesterRole: requester.role,
    targetId: target.id,
    targetEmail: target.email,
    newRole: body.role,
  })
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status })

  const role = body.role as string
  if (role !== target.role) {
    const { error } = await supabaseAdmin.from('club_members').update({ role }).eq('id', target.id)
    if (error) {
      if (isRoleCheckViolation(error)) {
        return NextResponse.json(
          { error: 'The new roles are available after the roles SQL is run in Supabase.', code: 'needs_sql' },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, role, warnings: roleWarnings(role, target.teams, target.lab_subdivision) })
}
