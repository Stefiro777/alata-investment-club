'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '../../DashboardProfileContext'
import { Tabs } from '@/app/components/member/ui'
import MentorsTab from '../MentorsTab'
import AvailabilityPanel from '../AvailabilityPanel'
import BookingsPanel from '../BookingsPanel'
import SuggestionsTab from '../SuggestionsTab'
import type { MentorLite } from '../ui'

const TABS = [
  { key: 'mentors' as const,       label: 'Mentors' },
  { key: 'availability' as const,  label: 'Availability' },
  { key: 'bookings' as const,      label: 'Bookings' },
  { key: 'suggestions' as const,   label: 'Suggerimenti Carrello' },
]
type Tab = typeof TABS[number]['key']

/**
 * Career management for the team (career team, bod/director). Sessions are tied to
 * mentors, not to services: each mentor has their own hours and notification email.
 * Mentors manage their own calendar from /dashboard/career/me.
 */
export default function CareerBookingsPage() {
  const profile = useProfile()
  const router  = useRouter()

  const [tab, setTab]                     = useState<Tab>('mentors')
  const [mentors, setMentors]             = useState<MentorLite[]>([])
  // Access control (the APIs enforce it again)
  const allowed = !!profile && (
    profile.role === 'bod' ||
    profile.role === 'director' ||
    (profile.teams ?? []).includes('career')
  )
  const accessChecked = allowed
  useEffect(() => {
    if (profile && !allowed) router.push('/dashboard')
  }, [profile, allowed, router])

  // Full admin listing, used by the Availability and Bookings tabs
  useEffect(() => {
    if (!accessChecked) return
    fetch('/api/career/mentors')
      .then(r => r.json())
      .then(json => setMentors(((json.data ?? []) as MentorLite[]).map(m => ({ id: m.id, full_name: m.full_name }))))
  }, [accessChecked, tab])

  if (!accessChecked) {
    return (
      <div className="max-w-5xl mx-auto px-8 py-12">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">

      <div className="mb-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Career Bookings</h1>
        <div className="w-8 h-px bg-forest" />
      </div>

      {/* Tab bar — scrolls horizontally within itself on narrow viewports instead of
          pushing the whole page into overflow (border lives on the scroll container
          so it still spans the full width even when the tabs don't). */}
      <div className="mb-8">
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {tab === 'mentors'      && <MentorsTab />}
      {tab === 'availability' && <AvailabilityPanel key={mentors.map(m => m.id).join()} mentors={mentors} />}
      {tab === 'bookings'     && <BookingsPanel mentors={mentors} staff />}
      {tab === 'suggestions'  && <SuggestionsTab />}
    </div>
  )
}
