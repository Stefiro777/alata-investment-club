'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type NextEvent = { id: string; title: string; status: string } | null

function Switch({ label, detail, on, busy, onToggle }: { label: string; detail: string; on: boolean; busy: boolean; onToggle: () => void }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-night/20 py-3.5">
      <div>
        <div className="font-serif text-[22px] font-medium leading-[1.1]">{label}</div>
        <div className="mt-[3px] text-[12px] text-earth-600">{detail}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onToggle}
        disabled={busy}
        className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-club' : 'bg-night/20'}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-ivory shadow transition-[left] ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  )
}

/** Board ABod "Switches": applications on Join Us, registrations for the next event. */
export default function OverviewSwitches({ applicationsOpen, nextEvent }: { applicationsOpen: boolean; nextEvent: NextEvent }) {
  const [apps, setApps] = useState(applicationsOpen)
  const [event, setEvent] = useState(nextEvent)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleApps() {
    setBusy('apps')
    setError(null)
    const value = !apps
    const { error } = await createClient().from('settings').upsert({ key: 'applications_open', value: value ? 'true' : 'false' }, { onConflict: 'key' })
    if (error) setError(error.message)
    else setApps(value)
    setBusy(null)
  }

  async function toggleRegistrations() {
    if (!event) return
    setBusy('event')
    setError(null)
    const status = event.status === 'open' ? 'coming_soon' : 'open'
    const { error } = await createClient().from('upcoming_events').update({ status }).eq('id', event.id)
    if (error) setError(error.message)
    else setEvent({ ...event, status })
    setBusy(null)
  }

  return (
    <div>
      <Switch label="Applications" detail={apps ? 'The forms are open on Join Us.' : 'Join Us shows applications as closed.'} on={apps} busy={busy === 'apps'} onToggle={toggleApps} />
      {event ? (
        <Switch
          label="Event registrations"
          detail={`${event.title}: ${event.status === 'open' ? 'open' : 'not open yet'}.`}
          on={event.status === 'open'}
          busy={busy === 'event'}
          onToggle={toggleRegistrations}
        />
      ) : (
        <p className="border-b border-night/20 py-3.5 text-[13px] text-earth-600">No upcoming event to open.</p>
      )}
      {error && <p role="alert" className="mt-3 text-[13px] text-[#8a2a1d]">{error}</p>}
    </div>
  )
}
