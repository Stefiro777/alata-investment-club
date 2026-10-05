import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { requireTeamAccess } from '@/lib/auth'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STATUSES = ['pending', 'reviewed', 'accepted', 'rejected']

// Status changes from the admin "Job Offers" page. They used to run through the
// browser client, but job_applications had no UPDATE policy, so they silently
// did nothing. Same access as archive/delete: career team + bod/director.
export async function PATCH(req: NextRequest) {
  if (!(await requireTeamAccess('career'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id, status } = await req.json()
  if (!id || typeof status !== 'string' || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Missing id or invalid status' }, { status: 400 })
  }
  const { error } = await supabaseAdmin.from('job_applications').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
