'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import DashboardClient from '../DashboardClient'
import { Section } from '@/app/components/member/ui'
import type { Resource } from '@/lib/types'

type Mentor = { id: string; full_name: string; photo_url: string | null }

/** Board ACad, top: one-to-one sessions with a mentor, free for members. */
export function MentorStrip() {
  const [mentors, setMentors] = useState<Mentor[]>([])
  useEffect(() => {
    fetch('/api/career/mentors?view=public')
      .then(r => r.json())
      .then(j => setMentors((j.data ?? []) as Mentor[]))
      .catch(() => {})
  }, [])
  if (mentors.length === 0) return null

  // "Paolo Mangiarini" → "Paolo M."
  const short = (n: string) => { const [a, b] = n.split(' '); return b ? `${a} ${b[0]}.` : a }

  return (
    <div className="mt-8 grid gap-6 bg-pine px-6 py-6 text-ivory md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center md:px-9">
      <div>
        <div className="rd-eyebrow text-[11px] text-ivory/70">One to one · Free for members</div>
        <p className="rd-display mt-2 max-w-[420px] text-[24px]">Thirty minutes with a mentor who has been where you want to go.</p>
      </div>
      <ul className="flex gap-4">
        {mentors.slice(0, 4).map(m => (
          <li key={m.id} className="w-[58px] text-center">
            <div className="mx-auto h-[70px] w-[58px] overflow-hidden bg-moss">
              {m.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo_url} alt="" className="h-full w-full object-cover grayscale" />
              )}
            </div>
            <div className="mt-1.5 truncate text-[11px] text-ivory/80">{short(m.full_name)}</div>
          </li>
        ))}
      </ul>
      <Link href="/career-service#mentors" className="rd-italic text-[26px] hover:underline underline-offset-[0.18em]">Book a session</Link>
    </div>
  )
}

/** Board ACad, bottom: the resources in five folders (moved from /dashboard/resources). */
export function JobResources({ displayName }: { displayName: string }) {
  const [resources, setResources] = useState<Resource[] | null>(null)
  useEffect(() => {
    createClient()
      .from('resources')
      .select('id, title, description, url, category, subcategory, subcategory_order, is_folder, order_index, created_at')
      .order('order_index', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .then(({ data }) => setResources((data ?? []) as Resource[]))
  }, [])
  return (
    <Section id="resources" title="Resources" meta="Career · Master · Learning · Alata documents">
      {resources === null
        ? <p className="py-6 text-[13px] text-earth-600">Loading…</p>
        : <DashboardClient displayName={displayName} resources={resources} />}
    </Section>
  )
}
