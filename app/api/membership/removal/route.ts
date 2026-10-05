import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess, PRIVILEGED_ROLES } from '@/lib/auth'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { computeMembershipExpiry, loadRenewalRule } from '@/lib/membership'

const SUPERADMIN_EMAIL = 'finullistefano@gmail.com'

/**
 * Remove a member from (or restore them to) the membership.
 * Only bod/director/superadmin (requirePrivilegedAccess), explicit confirmation
 * in the payload.
 *
 *  remove  -> membership_expires_at = NULL, membership_reminder_sent_for = NULL,
 *             membership_removed_at = now(), membership_removed_by = caller.
 *  restore -> expiry = the 31/12 given by the renewal rule for today, removed_* cleared.
 *
 * Never touched: the club_members row itself, role, teams, user_id, payments,
 * transactions. bod/director and the superadmin cannot be removed.
 */
export async function POST(req: NextRequest) {
  const caller = await requirePrivilegedAccess()
  if (!caller) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: { id?: unknown; action?: unknown; confirm?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { id, action, confirm } = body
  if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (action !== 'remove' && action !== 'restore') {
    return NextResponse.json({ error: 'action must be "remove" or "restore"' }, { status: 400 })
  }
  if (confirm !== true) return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })

  const service = createServiceClient()
  const { data: target } = await service
    .from('club_members')
    .select('id, email, role, membership_removed_at')
    .eq('id', id)
    .maybeSingle()
  if (!target) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  if (action === 'remove') {
    if ((PRIVILEGED_ROLES as readonly string[]).includes(target.role) || target.email === SUPERADMIN_EMAIL) {
      return NextResponse.json({ error: 'BoD, Management and the superadmin cannot be removed from the membership' }, { status: 403 })
    }
    if (target.membership_removed_at) return NextResponse.json({ error: 'Already removed' }, { status: 409 })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await service
      .from('club_members')
      .update({
        membership_expires_at: null,
        membership_reminder_sent_for: null,
        membership_removed_at: new Date().toISOString(),
        membership_removed_by: user?.id ?? null,
      })
      .eq('id', id)
      .select('id, membership_expires_at, membership_removed_at')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ member: data })
  }

  // restore
  if (!target.membership_removed_at) return NextResponse.json({ error: 'Not removed' }, { status: 409 })
  const expiry = computeMembershipExpiry(new Date(), await loadRenewalRule(service))
  const { data, error } = await service
    .from('club_members')
    .update({
      membership_expires_at: expiry.toISOString(),
      membership_removed_at: null,
      membership_removed_by: null,
      membership_reminder_sent_for: null,
    })
    .eq('id', id)
    .select('id, membership_expires_at, membership_removed_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}
