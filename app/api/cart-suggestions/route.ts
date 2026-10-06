import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSessionPricing } from '@/lib/career-session'
import { getMentorSlots, romeNow } from '@/lib/career-slots'

type SupabaseService = ReturnType<typeof createServiceClient>

type SuggestableMentor = {
  id: string
  full_name: string
  photo_url: string | null
  nextSlot: { date: string; time: string }
}

/**
 * Active mentors with a free slot in the current or next month (Rome time), in the
 * display order configured by the team. The caller rotates through them.
 */
async function mentorsWithFreeSlot(supabase: SupabaseService, excludeMentorId: string | null): Promise<SuggestableMentor[]> {
  const { data: mentors } = await supabase
    .from('career_mentors')
    .select('id, full_name, photo_url')
    .eq('active', true)
    .order('display_order', { ascending: true })

  const now = romeNow()
  const [y, m] = now.date.split('-').map(Number)
  const months = [{ year: y, month: m }, m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 }]

  const result: SuggestableMentor[] = []
  for (const mentor of mentors ?? []) {
    if (mentor.id === excludeMentorId) continue
    for (const { year, month } of months) {
      const next = (await getMentorSlots(supabase, mentor.id, year, month)).find(s => s.available)
      if (next) {
        result.push({ ...mentor, nextSlot: { date: next.date, time: next.time } })
        break
      }
    }
  }
  return result
}

/**
 * Public. `exclude_mentor_id` leaves out the mentor being booked right now;
 * `Authorization: Bearer <token>` gets the member price (0 for active members).
 *
 * A `career_service` suggestion no longer references a service: it is resolved to an
 * active mentor with a free slot (rotating by day so the same mentor is not always
 * pushed), priced at the single session price. When no mentor qualifies, it is not
 * returned at all.
 */
export async function GET(req: NextRequest) {
  const supabase = createServiceClient()
  const excludeMentorId = req.nextUrl.searchParams.get('exclude_mentor_id')

  const { data: suggestions, error } = await supabase
    .from('cart_suggestions')
    .select('id, type, reference_id, label, description, sort_order')
    .eq('visible', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const careerRows = (suggestions ?? []).filter(s => s.type === 'career_service')
  let careerPool: SuggestableMentor[] = []
  let pricing: Awaited<ReturnType<typeof getSessionPricing>> | null = null
  if (careerRows.length > 0) {
    ;[careerPool, pricing] = await Promise.all([
      mentorsWithFreeSlot(supabase, excludeMentorId),
      getSessionPricing(supabase, req.headers.get('authorization')),
    ])
  }
  // Day-based rotation; each Career suggestion takes a different mentor.
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  const picked = new Set<string>()

  // Enrich each suggestion with price + image from the referenced table
  const enriched = await Promise.all(
    (suggestions ?? []).map(async (s) => {
      if (s.type === 'career_service') {
        if (!pricing) return null
        const available = careerPool.filter(m => !picked.has(m.id))
        if (available.length === 0) return null
        const mentor = available[dayIndex % available.length]
        picked.add(mentor.id)
        return {
          ...s,
          type: 'career_service',
          reference_id: mentor.id,
          mentor_id: mentor.id,
          mentor_name: mentor.full_name,
          label: `Career session con ${mentor.full_name}`,
          description: s.description || `Prossimo slot libero: ${mentor.nextSlot.date} alle ${mentor.nextSlot.time}`,
          price_cents: pricing.effective_price_cents,
          list_price_cents: pricing.price_cents,
          image_url: mentor.photo_url,
          ref_name: `Career session con ${mentor.full_name}`,
        }
      }

      if (s.type === 'merch_product') {
        // products table — handled when merch is introduced
        const { data: prod } = await supabase
          .from('products')
          .select('name, price_cents, image_url')
          .eq('id', s.reference_id)
          .maybeSingle()
        return {
          ...s,
          price_cents: prod?.price_cents ?? 0,
          image_url: prod?.image_url ?? null,
          ref_name: prod?.name ?? s.label,
        }
      }

      return { ...s, price_cents: 0, image_url: null, ref_name: s.label }
    })
  )

  return NextResponse.json({ suggestions: enriched.filter(Boolean) })
}
