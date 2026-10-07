import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

/**
 * Links the logged-in account to its club_members row (club_members.user_id).
 *
 * Members are created by email and linked on first dashboard visit. This used to be
 * an update from the browser, which the club_members_guard_self_update trigger now
 * rejects for non-privileged members (user_id is not self-editable), so it runs here
 * with the service role. Nothing comes from the request: the email and the id are
 * the ones of the session.
 *
 *  - no row for the session email            -> 404
 *  - member removed from the membership      -> 403, not linked
 *  - row already linked to this account      -> 200 { linked: true }
 *  - row linked to ANOTHER account           -> 409, untouched
 *  - user_id NULL                            -> set it, 200 { linked: true }
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const escaped = user.email.trim().replace(/[\\%_]/g, c => `\\${c}`)
  const { data: member, error } = await service
    .from('club_members')
    .select('id, user_id, membership_removed_at')
    .ilike('email', escaped)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  if (member.membership_removed_at) return NextResponse.json({ error: 'Membership removed' }, { status: 403 })

  if (member.user_id === user.id) return NextResponse.json({ linked: true })
  if (member.user_id) return NextResponse.json({ error: 'Already linked to another account' }, { status: 409 })

  // .is('user_id', null) keeps this race-safe: a concurrent link wins, this one does nothing.
  const { data: updated, error: updateError } = await service
    .from('club_members')
    .update({ user_id: user.id })
    .eq('id', member.id)
    .is('user_id', null)
    .select('id')
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (!updated || updated.length === 0) return NextResponse.json({ error: 'Already linked to another account' }, { status: 409 })
  return NextResponse.json({ linked: true })
}
