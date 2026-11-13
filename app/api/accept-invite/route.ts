import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { isRoleCheckViolation, roleForInviteTeam } from '@/lib/roles'

function adminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const supabaseAdmin = adminClient()

  const { data: invite, error } = await supabaseAdmin
    .from('invites')
    .select('email, team, lab_subdivision, used_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'Invite already used' }, { status: 410 })
  }

  const { email, team, lab_subdivision } = invite
  return NextResponse.json({ email, team, lab_subdivision })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = typeof body.token === 'string' ? body.token : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null
    const password = typeof body.password === 'string' ? body.password : ''

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }
    if (!fullName) {
      return NextResponse.json({ error: 'Full name required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const supabaseAdmin = adminClient()

    // Revalidate the invite — must still exist and be unused.
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('invites')
      .select('id, email, team, lab_subdivision, used_at')
      .eq('token', token)
      .maybeSingle()

    if (inviteError || !invite || invite.used_at) {
      return NextResponse.json({ error: 'Invite not found or already used' }, { status: 410 })
    }

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
    })

    if (createError || !created?.user) {
      // Race condition (e.g. double click): the auth user already exists.
      // Do not create club_members in that case — surface the error instead.
      const message = createError?.message ?? 'Failed to create user'
      const alreadyExists =
        createError?.code === 'email_exists' ||
        createError?.status === 422 ||
        /already registered|already exists/i.test(message)

      return NextResponse.json(
        { error: alreadyExists ? 'Un account con questa email esiste già.' : message },
        { status: alreadyExists ? 409 : 500 }
      )
    }

    const newMember = {
      user_id: created.user.id,
      email: invite.email,
      full_name: fullName,
      phone,
      teams: invite.team === 'member' ? [] : [invite.team],
      lab_subdivision: invite.lab_subdivision ?? null,
    }

    // The role is the team of the invitation (lab, media, events, alumni) or 'member'.
    // Until the roles SQL widens club_members_role_check, the DB refuses the new values:
    // then the person joins as 'member', with the same teams, and sees no error.
    const role = roleForInviteTeam(invite.team)
    let { error: memberError } = await supabaseAdmin.from('club_members').insert({ ...newMember, role })
    if (memberError && role !== 'member' && isRoleCheckViolation(memberError)) {
      ;({ error: memberError } = await supabaseAdmin.from('club_members').insert({ ...newMember, role: 'member' }))
    }

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 500 })
    }

    const { error: usedError } = await supabaseAdmin
      .from('invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    if (usedError && process.env.NODE_ENV === 'development') {
      console.error('[accept-invite] failed to mark invite as used:', usedError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
