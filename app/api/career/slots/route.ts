import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getMentorSlots } from '@/lib/career-slots'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const mentorId = searchParams.get('mentor_id')
    const year = parseInt(searchParams.get('year') ?? '', 10)
    const month = parseInt(searchParams.get('month') ?? '', 10)

    if (!mentorId || isNaN(year) || isNaN(month)) {
      return NextResponse.json({ error: 'mentor_id, year, and month are required' }, { status: 400 })
    }
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: mentor } = await supabase
      .from('career_mentors')
      .select('id')
      .eq('id', mentorId)
      .eq('active', true)
      .maybeSingle()
    if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 })

    return NextResponse.json({ slots: await getMentorSlots(supabase, mentorId, year, month) })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
