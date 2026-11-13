import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requirePrivilegedAccess } from '@/lib/auth'
import { inviteStatus, isMissingColumn } from '@/lib/invite-status'

// POST /api/invite/cancel  { id }
// Cancels a pending invitation: the row is kept, revoked_at says when and revoked_by who.
// A cancelled token is refused by /accept-invite. Only BoD and Management (the superadmin is a BoD member).
export async function POST(req: NextRequest) {
  try {
    const requester = await requirePrivilegedAccess()
    if (!requester) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({})) as { id?: unknown }
    if (typeof body.id !== 'string' || !body.id) {
      return NextResponse.json({ error: 'Invitation id required' }, { status: 400 })
    }

    const db = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const needsSql = () => NextResponse.json(
      { error: 'Cancelling invitations is available after the invites SQL is run in Supabase.', code: 'needs_sql' },
      { status: 409 },
    )

    const { data: invite, error: readError } = await db
      .from('invites')
      .select('id, used_at, revoked_at')
      .eq('id', body.id)
      .maybeSingle()
    if (readError) {
      if (isMissingColumn(readError)) return needsSql()
      return NextResponse.json({ error: readError.message }, { status: 500 })
    }
    if (!invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    const status = inviteStatus(invite)
    if (status === 'accepted') {
      return NextResponse.json({ error: 'This invitation was already accepted', code: 'used' }, { status: 409 })
    }
    if (status === 'cancelled') return NextResponse.json({ success: true, already: true })

    const { error } = await db
      .from('invites')
      .update({ revoked_at: new Date().toISOString(), revoked_by: requester.user_id })
      .eq('id', invite.id)
      .is('used_at', null)
    if (error) {
      if (isMissingColumn(error)) return needsSql()
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
