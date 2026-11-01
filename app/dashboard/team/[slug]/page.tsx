'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import PRTracker from '@/components/dashboard/PRTracker'
import MerchManager from '@/components/dashboard/MerchManager'
import { PageTitle, Section, Row, Tabs } from '@/app/components/member/ui'
import EventsContent from './EventsContent'

/*
 * Team pages (boards AEvd, AMed, ACtd). Access is checked on the server by
 * the layout next to this page (requireTeamAccess). Tasks and goals were
 * removed from the area; their tables stay in the database.
 */

const COPY: Record<string, { title: string; sub: string; visible: string }> = {
  events: { title: 'Events', sub: 'Create and manage the club’s events, registrations, stories, partners and venues.', visible: 'Visible to Events, Management and the BoD.' },
  media: { title: 'Media', sub: 'Posts, the editorial plan and the shop.', visible: 'Visible to Media, Management and the BoD.' },
  career: { title: 'Career', sub: 'Bookings, mentors, job offers, resources and the PR tracker.', visible: 'Visible to Career, Management and the BoD.' },
}

function MediaTeam() {
  const [tab, setTab] = useState<'shop' | 'ped'>('shop')
  return (
    <>
      <div className="mt-8"><Tabs tabs={[{ key: 'shop', label: 'Merch' }, { key: 'ped', label: 'PED' }]} value={tab} onChange={setTab} /></div>
      {tab === 'ped' ? (
        <Section title="Editorial plan" meta="All scheduled posts by month">
          <Row title="PED calendar" detail="LinkedIn, Instagram and the newsletter, one colour per channel." href="/dashboard/calendar?view=ped" action="Open" />
        </Section>
      ) : (
        <div className="mt-8"><MerchManager /></div>
      )}
    </>
  )
}

function CareerTeam() {
  const [tab, setTab] = useState<'overview' | 'pr'>('overview')
  return (
    <>
      <div className="mt-8"><Tabs tabs={[{ key: 'overview', label: 'Bookings and offers' }, { key: 'pr', label: 'PR tracker' }]} value={tab} onChange={setTab} /></div>
      {tab === 'pr' ? (
        <div className="mt-8"><PRTracker /></div>
      ) : (
        <Section title="Mentors, offers and resources">
          <Row title="Bookings and mentors" detail="Sessions booked, mentors, availability and cart suggestions." href="/dashboard/career/bookings" action="Open" />
          <Row title="Job applications" detail="Applications received through the Job Offers board, with CVs." href="/dashboard/career/applications" action="Open" />
          <Row title="Resources" detail="Add or change what members see in Job Offers." href="/dashboard/career/resources" action="Edit" />
        </Section>
      )}
    </>
  )
}

export default function TeamPage() {
  const params = useParams()
  const slug = (params.slug as string) ?? ''
  const copy = COPY[slug]
  if (!copy) return null

  return (
    <>
      <PageTitle title={copy.title} sub={copy.sub} />
      {slug === 'events' && <div className="mt-8"><EventsContent /></div>}
      {slug === 'media' && <MediaTeam />}
      {slug === 'career' && <CareerTeam />}
      <p className="mt-12 text-[12px] text-earth-500">{copy.visible}</p>
    </>
  )
}
