'use client'

import { useState, useEffect } from 'react'
import AvailabilityPanel from '../AvailabilityPanel'
import BookingsPanel from '../BookingsPanel'
import { inputCls, labelCls, btnPrimary } from '../ui'

type MeResponse = {
  linked: boolean
  staff?: boolean
  mentor?: {
    id: string
    full_name: string
    role_title: string | null
    notification_email: string
    active: boolean
    photo_url: string | null
  }
}

type Tab = 'availability' | 'bookings'

/**
 * A mentor's own page: their availability, their bookings and their notification
 * email. Nothing here takes a mentor id from the URL: /api/career/me and the panels
 * resolve the mentor from the session (career_mentors.member_id).
 */
export default function MyMentorPage() {
  const [me, setMe]           = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState<Tab>('availability')

  const [email, setEmail]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/career/me')
      .then(r => r.json())
      .then((json: MeResponse) => {
        setMe(json)
        setEmail(json.mentor?.notification_email ?? '')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function saveEmail(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaved(false); setError(null)
    const res = await fetch('/api/career/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_email: email }),
    })
    const json = await res.json()
    if (!res.ok) setError(json.error ?? 'Salvataggio non riuscito')
    else {
      setSaved(true)
      setMe(prev => prev?.mentor ? { ...prev, mentor: { ...prev.mentor, notification_email: json.data.notification_email } } : prev)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!me?.linked || !me.mentor) {
    return (
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
        <h1 className="font-serif text-4xl font-bold text-gray-900 mb-3">I miei orari</h1>
        <div className="w-8 h-px bg-forest mb-8" />
        <p className="text-sm text-gray-600 border-l-2 border-forest pl-4 max-w-xl">
          Il tuo account non è ancora collegato a un profilo mentor. Scrivi al team Career:
          appena il collegamento è attivo potrai gestire qui i tuoi orari e le tue prenotazioni.
        </p>
      </div>
    )
  }

  const mentor = me.mentor

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">
      <div className="mb-10">
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">I miei orari</h1>
        <div className="w-8 h-px bg-forest" />
        <p className="text-sm text-gray-500 mt-4">{mentor.full_name}{mentor.role_title ? ` — ${mentor.role_title}` : ''}</p>
      </div>

      {!mentor.active && (
        <p className="mb-8 text-sm text-yellow-800 bg-yellow-50 border border-yellow-300 px-4 py-3">
          Il tuo profilo non è attivo: al momento non compari nella pagina pubblica e non sei prenotabile.
          Puoi comunque gestire orari e prenotazioni esistenti.
        </p>
      )}

      <form onSubmit={saveEmail} className="mb-10 border border-gray-200 bg-white px-5 py-5 max-w-xl">
        <label className={labelCls} htmlFor="notification-email">Email per le notifiche di prenotazione</label>
        <div className="flex gap-3 items-center">
          <input id="notification-email" type="email" required value={email}
            onChange={e => setEmail(e.target.value)} className={inputCls} />
          <button type="submit" disabled={saving || email.trim() === mentor.notification_email} className={`${btnPrimary} whitespace-nowrap`}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
        {saved && <p className="mt-2 text-xs text-forest font-medium">Saved</p>}
      </form>

      <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-gray-200 mb-8"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-0 w-max">
          {([['availability', 'Availability'], ['bookings', 'Bookings']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`px-5 py-3 text-xs font-semibold uppercase tracking-widest transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === key ? 'border-forest text-forest' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'availability' && <AvailabilityPanel mentors={[{ id: mentor.id, full_name: mentor.full_name }]} fixedMentorId={mentor.id} />}
      {tab === 'bookings' && <BookingsPanel mentors={[]} fixedMentorId={mentor.id} staff={false} />}
    </div>
  )
}
