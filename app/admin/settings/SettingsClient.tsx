'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import SyncCalendarButton from '../components/SyncCalendarButton'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-forest">{title}</h2>
      <div className="w-8 h-px bg-forest mt-2" />
    </div>
  )
}

export default function SettingsClient({
  adminUsers,
  superadmin,
  applicationsOpen,
  showPrices,
  priceCV: initialPriceCV,
  priceMaster: initialPriceMaster,
  priceCareer: initialPriceCareer,
  showAlumni,
  showAlumniReviews,
  showEventsReviews,
}: {
  adminUsers: string[]
  superadmin: string
  applicationsOpen: boolean
  showPrices: boolean
  priceCV: string
  priceMaster: string
  priceCareer: string
  showAlumni: boolean
  showAlumniReviews: boolean
  showEventsReviews: boolean
}) {
  const router = useRouter()

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

  const [priceCV, setPriceCV] = useState(initialPriceCV)
  const [priceMaster, setPriceMaster] = useState(initialPriceMaster)
  const [priceCareer, setPriceCareer] = useState(initialPriceCareer)
  const [savingPrices, setSavingPrices] = useState(false)
  const [pricesSaved, setPricesSaved] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)

  // Invite member state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  // Admin users state
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [removingEmail, setRemovingEmail] = useState<string | null>(null)

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

  async function handleSavePrices(e: React.FormEvent) {
    e.preventDefault()
    setSavingPrices(true)
    setPricesSaved(false)
    setPricesError(null)
    const supabase = createClient()
    const rows = [
      { key: 'price_cv_review', value: priceCV },
      { key: 'price_master_orientation', value: priceMaster },
      { key: 'price_career_orientation', value: priceCareer },
    ]
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' })
    if (error) {
      setPricesError(error.message)
    } else {
      setPricesSaved(true)
      setTimeout(() => setPricesSaved(false), 3000)
    }
    setSavingPrices(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(false)

    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const text = await res.text()
    let json: { error?: string } = {}
    try { json = JSON.parse(text) } catch { json = { error: text } }

    if (!res.ok) {
      setInviteError(json.error ?? 'Unknown error')
    } else {
      setInviteEmail('')
      setInviteSuccess(true)
    }
    setInviting(false)
  }

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault()
    const email = newAdminEmail.trim().toLowerCase()
    if (!email) return
    setAddingAdmin(true)
    setAdminError(null)

    const supabase = createClient()
    const { error } = await supabase.from('admin_users').insert({ email })

    if (error) {
      setAdminError(error.message)
    } else {
      setNewAdminEmail('')
      router.refresh()
    }
    setAddingAdmin(false)
  }

  async function handleRemoveAdmin(email: string) {
    setRemovingEmail(email)
    const supabase = createClient()
    await supabase.from('admin_users').delete().eq('email', email)
    setRemovingEmail(null)
    router.refresh()
  }

  return (
    <div className="max-w-5xl mx-auto px-8 py-10 space-y-16">

      {/* ══ Settings ══════════════════════════════════════════════════════════ */}
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

          {/* Show Prices */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-ink-900">Show Prices – Career Service</p>
              <p className="text-xs text-ink-500 mt-0.5">
                Mostra o nasconde i prezzi nella pagina{' '}
                <span className="font-medium">/career-service</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {priceToggleSaved && <span className="text-xs text-forest font-medium">Saved</span>}
              <button
                onClick={handleTogglePrices}
                disabled={togglingPrices}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-fast ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${pricesVisible ? 'bg-forest' : 'bg-[#d1d5db]'}`}
                role="switch"
                aria-checked={pricesVisible}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${pricesVisible ? 'translate-x-5' : 'translate-x-0'}`} />
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

          <div className="border-t border-black/5" />

          {/* Prezzi Career Service */}
          <div>
            <p className="text-sm font-medium text-ink-900 mb-1">Prezzi Career Service</p>
            <p className="text-xs text-ink-500 mb-4">
              Valori mostrati nella pagina <span className="font-medium">/career-service</span>.
            </p>
            <form onSubmit={handleSavePrices} className="space-y-3">
              {[
                { label: 'CV Review', value: priceCV, setter: setPriceCV },
                { label: 'Master Orientation', value: priceMaster, setter: setPriceMaster },
                { label: 'Career Orientation', value: priceCareer, setter: setPriceCareer },
              ].map(({ label, value, setter }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-xs text-ink-500 w-40 flex-shrink-0">{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
                    placeholder="€29,99"
                  />
                </div>
              ))}
              {pricesError && (
                <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{pricesError}</p>
              )}
              <div className="flex items-center gap-4 pt-1">
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPrices ? '…' : 'Save Prices'}
                </button>
                {pricesSaved && <span className="text-xs text-forest font-medium">Saved</span>}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ══ Invite Member ═════════════════════════════════════════════════════ */}
      <section id="invite-member">
        <SectionHeading title="Invite Member" />

        <div className="bg-white border border-line-faint p-8">
          <p className="text-sm text-ink-500 mb-6">
            Send an invitation link by email. The new member will set their password by clicking the link.
          </p>

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="member@email.com"
              className="flex-1 px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {inviting ? '…' : 'Send Invite'}
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

      {/* ══ System Tools ══════════════════════════════════════════════════════ */}
      <section id="system-tools">
        <SectionHeading title="System Tools" />
        <SyncCalendarButton />
      </section>

      {/* ══ Admin Users ═══════════════════════════════════════════════════════ */}
      <section id="admin-users">
        <SectionHeading title="Admin Users" />

        <div className="bg-white border border-line-faint p-8 space-y-6">
          <form onSubmit={handleAddAdmin} className="flex gap-3">
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              placeholder="new@email.com"
              className="flex-1 px-4 py-3 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={addingAdmin}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-fast disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {addingAdmin ? '…' : 'Add Admin'}
            </button>
          </form>

          {adminError && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1">{adminError}</p>
          )}

          <div className="space-y-px bg-black/5 rounded-sm">
            {adminUsers.map(email => (
              <div key={email} className="bg-white px-6 py-4 flex items-center justify-between gap-6">
                <span className="text-sm text-ink-900 font-medium">
                  {email}
                  {email === superadmin && (
                    <span className="ml-2 text-xs text-forest tracking-widest uppercase">superadmin</span>
                  )}
                </span>
                {email !== superadmin && (
                  <button
                    onClick={() => handleRemoveAdmin(email)}
                    disabled={removingEmail === email}
                    className="flex-shrink-0 border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {removingEmail === email ? '…' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
