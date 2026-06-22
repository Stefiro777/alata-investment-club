import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
function getDayOfWeekOccurrences(year: number, month: number, dow: number): string[] {
  const dates: string[] = []
  const totalDays = daysInMonth(year, month)
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month - 1, d)
    if (date.getDay() === dow) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
  }
  return dates
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const service_id = searchParams.get('service_id')
    const yearStr = searchParams.get('year')
    const monthStr = searchParams.get('month')

    if (!service_id || !yearStr || !monthStr) {
      return NextResponse.json({ error: 'service_id, year, and month are required' }, { status: 400 })
    }

    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    const [{ data: service, error: serviceErr }, { data: availability, error: availErr }] = await Promise.all([
      supabaseAdmin
        .from('career_services')
        .select('max_bookings_per_slot, price_cents, duration_minutes')
        .eq('id', service_id)
        .single(),
      supabaseAdmin
        .from('career_availability')
        .select('*')
        .eq('service_id', service_id)
        .eq('active', true),
    ])

    if (serviceErr) return NextResponse.json({ error: serviceErr.message }, { status: 400 })
    if (availErr) return NextResponse.json({ error: availErr.message }, { status: 400 })
    if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const maxBookings: number = service.max_bookings_per_slot ?? 1
    const duration: number = service.duration_minutes ?? 60
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const monthEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    // Parse "HH:MM[:SS]" to total minutes since midnight
    function toMinutes(t: string): number {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }

    // Format total minutes as "HH:MM"
    function fromMinutes(mins: number): string {
      return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
    }

    // Subdivide an availability window into slots of `duration` minutes
    function subdivide(startTime: string, endTime: string | null): string[] {
      const start = toMinutes(startTime)
      const end = endTime ? toMinutes(endTime) : start + duration
      const times: string[] = []
      for (let t = start; t + duration <= end; t += duration) {
        times.push(fromMinutes(t))
      }
      // Always include at least the start time if window is shorter than duration
      if (times.length === 0) times.push(fromMinutes(start))
      return times
    }

    // Collect all (date, time) pairs for this month
    const slots: { date: string; time: string }[] = []

    for (const row of availability ?? []) {
      if (row.type === 'recurring' && row.day_of_week != null && row.start_time) {
        const dates = getDayOfWeekOccurrences(year, month, row.day_of_week)
        const times = subdivide(row.start_time, row.end_time)
        for (const date of dates) {
          for (const time of times) {
            slots.push({ date, time })
          }
        }
      } else if (row.type === 'one_time' && row.date && row.start_time) {
        if (row.date >= monthStart && row.date < monthEnd) {
          const times = subdivide(row.start_time, row.end_time)
          for (const time of times) {
            slots.push({ date: row.date, time })
          }
        }
      }
    }

    // Deduplicate
    const unique = Array.from(
      new Map(slots.map(s => [`${s.date}|${s.time}`, s])).values()
    )

    if (unique.length === 0) {
      return NextResponse.json({ slots: [] })
    }

    // Fetch booking counts for all slots in this month in one query
    const { data: bookings } = await supabaseAdmin
      .from('career_bookings')
      .select('slot_date, slot_time')
      .eq('service_id', service_id)
      .gte('slot_date', monthStart)
      .lt('slot_date', monthEnd)
      .neq('status', 'cancelled')

    const countMap = new Map<string, number>()
    for (const b of bookings ?? []) {
      const key = `${b.slot_date}|${b.slot_time.slice(0, 5)}`
      countMap.set(key, (countMap.get(key) ?? 0) + 1)
    }

    const result = unique
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
      .map(s => ({
        date: s.date,
        time: s.time, // already HH:MM from fromMinutes()
        available: (countMap.get(`${s.date}|${s.time}`) ?? 0) < maxBookings,
      }))

    return NextResponse.json({ slots: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
