'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ABOUT_STATS_KEY, ABOUT_STATS_COUNT, type AboutStat } from '@/lib/about-stats'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

export default function SettingsClient({
  applicationsOpen,
  showPrices,
  careerSessionPriceCents,
  showAlumni,
  showAlumniReviews,
  showEventsReviews,
  aboutStats,
}: {
  applicationsOpen: boolean
  showPrices: boolean
  /** settings.career_session_price_cents (text): single price of a 30-minute Career session. */
  careerSessionPriceCents: string
  showAlumni: boolean
  showAlumniReviews: boolean
  showEventsReviews: boolean
  aboutStats: AboutStat[]
}) {
  // About page metrics (fixed number of slots, padded with empty rows)
  const [stats, setStats] = useState<AboutStat[]>(
    Array.from({ length: ABOUT_STATS_COUNT }, (_, i) => aboutStats[i] ?? { value: '', label: '' })
  )
  const [savingStats, setSavingStats] = useState(false)
  const [statsSaved, setStatsSaved] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  async function handleSaveStats(e: React.FormEvent) {
    e.preventDefault()
    setSavingStats(true)
    setStatsSaved(false)
    setStatsError(null)
    const cleaned = stats
      .map(s => ({ value: s.value.trim(), label: s.label.trim() }))
      .filter(s => s.value && s.label)
    if (cleaned.length === 0) {
      setStatsError('Inserisci almeno una metrica (valore ed etichetta).')
      setSavingStats(false)
      return
    }
    const supabase = createClient()
    const { error } = await supabase
      .from('settings')
      .upsert({ key: ABOUT_STATS_KEY, value: JSON.stringify(cleaned) }, { onConflict: 'key' })
    if (error) {
      setStatsError(error.message)
    } else {
      setStatsSaved(true)
      setTimeout(() => setStatsSaved(false), 3000)
    }
    setSavingStats(false)
  }

  // Settings toggles state
  const [appsOpen, setAppsOpen] = useState(applicationsOpen)
  const [togglingApps, setTogglingApps] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [pricesVisible, setPricesVisible] = useState(showPrices)
  const [togglingPrices, setTogglingPrices] = useState(false)
  const [priceToggleSaved, setPriceToggleSaved] = useState(false)

  const [alumniVisible, setAlumniVisible] = useState(showAlumni)
  const [togglingAlumni, setTogglingAlumni] = useState(false)
  const [alumniToggleSaved, setAlumniToggleSaved] = useState(false)

  const [alumniReviewsVisible, setAlumniReviewsVisible] = useState(showAlumniReviews)
  const [togglingAlumniReviews, setTogglingAlumniReviews] = useState(false)
  const [alumniReviewsSaved, setAlumniReviewsSaved] = useState(false)

  const [eventsReviewsVisible, setEventsReviewsVisible] = useState(showEventsReviews)
  const [togglingEventsReviews, setTogglingEventsReviews] = useState(false)
  const [eventsReviewsSaved, setEventsReviewsSaved] = useState(false)

  const [sessionPrice, setSessionPrice] = useState(() => {
    const cents = Number(careerSessionPriceCents)
    return Number.isInteger(cents) && cents >= 0 ? (cents / 100).toFixed(2).replace('.', ',') : '30,00'
  })
  const [savingPrices, setSavingPrices] = useState(false)
  const [pricesSaved, setPricesSaved] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)

  async function handleSaveSessionPrice(e: React.FormEvent) {
    e.preventDefault()
    setPricesSaved(false)
    setPricesError(null)
    const normalized = sessionPrice.trim().replace(/^€\s*/, '').replace(',', '.')
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      setPricesError('Inserisci un importo valido, ad esempio 30 o 30,50.')
      return
    }
    const cents = Math.round(parseFloat(normalized) * 100)
    if (cents > 100_000) {
      setPricesError('Importo troppo alto (massimo 1.000 €).')
      return
    }
    setSavingPrices(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'career_session_price_cents', value: String(cents) }, { onConflict: 'key' })
    if (error) {
      setPricesError(error.message)
    } else {
      setSessionPrice((cents / 100).toFixed(2).replace('.', ','))
      setPricesSaved(true)
      setTimeout(() => setPricesSaved(false), 3000)
    }
    setSavingPrices(false)
  }

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteTeam, setInviteTeam] = useState('')
  const [inviteLabSubdivision, setInviteLabSubdivision] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  async function handleToggleApplications() {
    setTogglingApps(true)
    setSettingsSaved(false)
    const supabase = createClient()
    const newValue = !appsOpen
    await supabase
      .from('settings')
      .upsert({ key: 'applications_open', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setAppsOpen(newValue)
    setTogglingApps(false)
    setSettingsSaved(true)
  }

  async function handleTogglePrices() {
    setTogglingPrices(true)
    setPriceToggleSaved(false)
    const supabase = createClient()
    const newValue = !pricesVisible
    await supabase
      .from('settings')
      .upsert({ key: 'show_prices', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setPricesVisible(newValue)
    setTogglingPrices(false)
    setPriceToggleSaved(true)
  }

  async function handleToggleAlumni() {
    setTogglingAlumni(true)
    setAlumniToggleSaved(false)
    const supabase = createClient()
    const newValue = !alumniVisible
    await supabase
      .from('settings')
      .upsert({ key: 'show_alumni', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setAlumniVisible(newValue)
    setTogglingAlumni(false)
    setAlumniToggleSaved(true)
  }

  async function handleToggleAlumniReviews() {
    setTogglingAlumniReviews(true)
    setAlumniReviewsSaved(false)
    const supabase = createClient()
    const newValue = !alumniReviewsVisible
    await supabase
      .from('settings')
      .upsert({ key: 'show_alumni_reviews', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setAlumniReviewsVisible(newValue)
    setTogglingAlumniReviews(false)
    setAlumniReviewsSaved(true)
  }

  async function handleToggleEventsReviews() {
    setTogglingEventsReviews(true)
    setEventsReviewsSaved(false)
    const supabase = createClient()
    const newValue = !eventsReviewsVisible
    await supabase
      .from('settings')
      .upsert({ key: 'show_events_reviews', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    setEventsReviewsVisible(newValue)
    setTogglingEventsReviews(false)
    setEventsReviewsSaved(true)
  }


  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    if (!inviteTeam) { setInviteError('Team is required.'); return }
    if (inviteTeam === 'lab' && !inviteLabSubdivision) { setInviteError('Lab Subdivision is required for team Lab.'); return }
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(false)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, team: inviteTeam, lab_subdivision: inviteTeam === 'lab' ? inviteLabSubdivision : null }),
    })
    const text = await res.text()
    let json: { error?: string } = {}
    try { json = JSON.parse(text) } catch { json = { error: text } }

    if (!res.ok) {
      setInviteError(json.error ?? 'Unknown error')
    } else {
      setInviteEmail('')
      setInviteTeam('')
      setInviteLabSubdivision('')
      setInviteSuccess(true)
    }
    setInviting(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-16">

      {/* â•â• Settings â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="settings">
        <SectionHeading title="Settings" />

        <div className="bg-white border border-line-faint p-8 space-y-6">
          {/* Applications Open */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink-900">Applications Open</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Enables or disables the application form on{' '}
                <span className="font-medium">/join-us</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {settingsSaved && <span className="text-xs text-forest font-medium">Saved</span>}
              <button
                onClick={handleToggleApplications}
                disabled={togglingApps}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${appsOpen ? 'bg-forest' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={appsOpen}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${appsOpen ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Alumni Page */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink-900">Show Alumni Page</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Enables or disables the{' '}
                <span className="font-medium">/team/alumni</span> page and the link in{' '}
                <span className="font-medium">/team</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {alumniToggleSaved && <span className="text-xs text-forest font-medium">Saved</span>}
              <button
                onClick={handleToggleAlumni}
                disabled={togglingAlumni}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${alumniVisible ? 'bg-forest' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={alumniVisible}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${alumniVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Alumni Reviews */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink-900">Show Alumni Reviews</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Mostra o nasconde la sezione recensioni in{' '}
                <span className="font-medium">/team/alumni</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {alumniReviewsSaved && <span className="text-xs text-forest font-medium">Saved</span>}
              <button
                onClick={handleToggleAlumniReviews}
                disabled={togglingAlumniReviews}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${alumniReviewsVisible ? 'bg-forest' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={alumniReviewsVisible}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${alumniReviewsVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Events Reviews */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink-900">Show Events Reviews</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Mostra o nasconde la sezione recensioni in{' '}
                <span className="font-medium">/events</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {eventsReviewsSaved && <span className="text-xs text-forest font-medium">Saved</span>}
              <button
                onClick={handleToggleEventsReviews}
                disabled={togglingEventsReviews}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${eventsReviewsVisible ? 'bg-forest' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={eventsReviewsVisible}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${eventsReviewsVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* â•â• Invite Member â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="career-service">
        <SectionHeading title="Career Service" />

        <div className="bg-white border border-line-faint p-8">
          <p className="text-sm font-medium text-ink-900 mb-1">Prezzo sessione (30 minuti)</p>
          <p className="text-xs text-ink-500 mb-4">
            Un solo prezzo per tutte le sessioni con i mentor. Le sessioni sono gratuite per i membri con
            membership attiva; il prezzo viene sempre calcolato dal server al momento della prenotazione.
          </p>
          <form onSubmit={handleSaveSessionPrice} className="flex items-center gap-3">
            <span className="text-sm text-ink-500">€</span>
            <input
              type="text"
              inputMode="decimal"
              value={sessionPrice}
              onChange={e => setSessionPrice(e.target.value)}
              aria-label="Prezzo sessione Career in euro"
              placeholder="30,00"
              className="w-32 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={savingPrices}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingPrices ? '…' : 'Save'}
            </button>
            {pricesSaved && <span className="text-xs text-forest font-medium">Saved</span>}
          </form>
          {pricesError && (
            <p className="mt-3 text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{pricesError}</p>
          )}
        </div>
      </section>

      <section id="about-stats">
        <SectionHeading title="About Metrics" />

        <div className="bg-white border border-line-faint p-8">
          <p className="text-sm text-ink-500 mb-6">
            Le metriche della fascia numeri nella homepage (About). Il valore può includere un suffisso, ad esempio{' '}
            <span className="font-medium">50+</span> o <span className="font-medium">190K+</span>. Le righe vuote non vengono mostrate.
          </p>
          <form onSubmit={handleSaveStats} className="space-y-3">
            {stats.map((s, i) => (
              <div key={i} className="grid grid-cols-[120px_1fr] gap-3">
                <input
                  value={s.value}
                  onChange={e => setStats(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  placeholder="50+"
                  maxLength={16}
                  aria-label={`Valore metrica ${i + 1}`}
                  className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors"
                />
                <input
                  value={s.label}
                  onChange={e => setStats(prev => prev.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  placeholder="Speaker sessions"
                  maxLength={60}
                  aria-label={`Etichetta metrica ${i + 1}`}
                  className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm bg-white transition-colors"
                />
              </div>
            ))}
            {statsError && <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{statsError}</p>}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingStats}
                className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50"
              >
                {savingStats ? '…' : 'Save'}
              </button>
              {statsSaved && <span className="text-xs text-forest font-medium">Saved</span>}
            </div>
          </form>
        </div>
      </section>

      <section id="invite-member">
        <SectionHeading title="Invite Member" />

        <div className="bg-white border border-line-faint p-8">
          <p className="text-sm text-ink-500 mb-6">
            Send an invitation link by email. The new member will set their password by clicking the link.
          </p>

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="member@email.com"
              className="flex-1 px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
            />
            <select
              required
              value={inviteTeam}
              onChange={e => { setInviteTeam(e.target.value); if (e.target.value !== 'lab') setInviteLabSubdivision('') }}
              className="px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors rounded-none"
            >
              <option value="" disabled>Team…</option>
              <option value="lab">Lab</option>
              <option value="events">Events</option>
              <option value="media">Media</option>
              <option value="alumni">Alumni</option>
            </select>
            <select
              value={inviteLabSubdivision}
              onChange={e => setInviteLabSubdivision(e.target.value)}
              disabled={inviteTeam !== 'lab'}
              required={inviteTeam === 'lab'}
              className="px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors rounded-none disabled:opacity-50"
            >
              <option value="">{inviteTeam === 'lab' ? 'Subdivision…' : 'Only for Lab'}</option>
              <option value="ma">M&amp;A</option>
              <option value="macro_markets">Macro &amp; Markets</option>
              <option value="equity_valuation">Equity &amp; Valuation</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {inviting ? 'â€¦' : 'Send Invite'}
            </button>
          </form>

          {inviteError && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1 mt-4">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="text-forest text-xs border-l-2 border-forest pl-3 py-1 mt-4">Invite sent!</p>
          )}
        </div>
      </section>

    </div>
  )
}
