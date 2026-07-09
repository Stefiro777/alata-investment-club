import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { requirePrivilegedAccess } from '@/lib/auth'

const ALUMNI_COLUMNS = 'id, name, role, graduation_year, linkedin_url, current_company, industry, photo_url, order_index, created_at'

export async function POST(req: NextRequest) {
  try {
    if (!(await requirePrivilegedAccess())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const name = String(body.name ?? '').trim()
    const role = String(body.role ?? '').trim()
    if (!name || !role) {
      return NextResponse.json({ error: 'name and role are required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('alumni')
      .insert({
        name,
        role,
        graduation_year: body.graduation_year ? String(body.graduation_year).trim() || null : null,
        linkedin_url: body.linkedin_url ? String(body.linkedin_url).trim() || null : null,
        current_company: body.current_company ? String(body.current_company).trim() || null : null,
        industry: body.industry ? String(body.industry).trim() || null : null,
        photo_url: body.photo_url ? String(body.photo_url).trim() || null : null,
      })
      .select(ALUMNI_COLUMNS)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ alumni: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[alumni] Unexpected error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
