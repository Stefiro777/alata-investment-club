'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-serif text-2xl font-bold text-[#0a0a0a]">{title}</h2>
      <div className="w-10 h-0.5 bg-[#1a4a3a] mt-2" />
    </div>
  )
}

export default function MembersClient({
  adminUsers,
  superadmin,
  applicationsOpen,
  showPrices,
  priceCV: initialPriceCV,
  priceMaster: initialPriceMaster,
  priceCareer: initialPriceCareer,
  showAlumni,
}: {
  adminUsers: string[]
  superadmin: string
  applicationsOpen: boolean
  showPrices: boolean
  priceCV: string
  priceMaster: string
  priceCareer: string
  showAlumni: boolean
}) {
  const router = useRouter()

  // Settings state
  const [appsOpen, setAppsOpen] = useState(applicationsOpen)
  const [togglingApps, setTogglingApps] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)

  const [pricesVisible, setPricesVisible] = useState(showPrices)
  const [togglingPrices, setTogglingPrices] = useState(false)
  const [priceToggleSaved, setPriceToggleSaved] = useState(false)

  const [alumniVisible, setAlumniVisible] = useState(showAlumni)
  const [togglingAlumni, setTogglingAlumni] = useState(false)
  const [alumniToggleSaved, setAlumniToggleSaved] = useState(false)

  const [priceCV, setPriceCV] = useState(initialPriceCV)
  const [priceMaster, setPriceMaster] = useState(initialPriceMaster)
  const [priceCareer, setPriceCareer] = useState(initialPriceCareer)
  const [savingPrices, setSavingPrices] = useState(false)
  const [pricesSaved, setPricesSaved] = useState(false)
  const [pricesError, setPricesError] = useState<string | null>(null)

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
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'show_prices', value: newValue ? 'true' : 'false' }, { onConflict: 'key' })
    console.log('[toggle prices] error:', error)
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
    const { error } = await supabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' })
    console.log('[save prices] error:', error)
    if (error) {
      setPricesError(error.message)
    } else {
      setPricesSaved(true)
      setTimeout(() => setPricesSaved(false), 3000)
    }
    setSavingPrices(false)
  }

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

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    let json: any = {}
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

  const navItems = [
    { label: 'Settings', id: 'settings' },
    { label: 'Invite Member', id: 'invite-member' },
    { label: 'Admin Users', id: 'admin-users' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10 space-y-16">

      {/* ── Quick-nav pills ── */}
      <nav className="flex flex-wrap gap-2">
        {navItems.map(({ label, id }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className="px-5 py-2 text-xs font-medium tracking-wide border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white transition-colors duration-150 rounded-full"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ══════════════════════════════════════
          Settings
      ══════════════════════════════════════ */}
      <section id="settings">
        <SectionHeading title="Settings" />

        <div className="bg-white border border-black/10 p-8 space-y-6">
          {/* Applications Open */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Applications Open</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Enables or disables the application form on{' '}
                <span className="font-medium">/join-us</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {settingsSaved && (
                <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>
              )}
              <button
                onClick={handleToggleApplications}
                disabled={togglingApps}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  appsOpen ? 'bg-[#1a4a3a]' : 'bg-[#d1d5db]'
                }`}
                role="switch"
                aria-checked={appsOpen}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
                    appsOpen ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Prices */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Show Prices – Career Service</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Mostra o nasconde i prezzi nella pagina{' '}
                <span className="font-medium">/career-service</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {priceToggleSaved && (
                <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>
              )}
              <button
                onClick={handleTogglePrices}
                disabled={togglingPrices}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  pricesVisible ? 'bg-[#1a4a3a]' : 'bg-[#d1d5db]'
                }`}
                role="switch"
                aria-checked={pricesVisible}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
                    pricesVisible ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Show Alumni Page */}
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-[#0a0a0a]">Show Alumni Page</p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Enables or disables the{' '}
                <span className="font-medium">/team/alumni</span> page and the link in{' '}
                <span className="font-medium">/team</span>.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {alumniToggleSaved && (
                <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>
              )}
              <button
                onClick={handleToggleAlumni}
                disabled={togglingAlumni}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  alumniVisible ? 'bg-[#1a4a3a]' : 'bg-[#d1d5db]'
                }`}
                role="switch"
                aria-checked={alumniVisible}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${
                    alumniVisible ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="border-t border-black/5" />

          {/* Prezzi Career Service */}
          <div>
            <p className="text-sm font-medium text-[#0a0a0a] mb-1">Prezzi Career Service</p>
            <p className="text-xs text-[#6b7280] mb-4">
              Valori mostrati nella pagina <span className="font-medium">/career-service</span>.
            </p>
            <form onSubmit={handleSavePrices} className="space-y-3">
              {[
                { label: 'CV Review', value: priceCV, setter: setPriceCV },
                { label: 'Master Orientation', value: priceMaster, setter: setPriceMaster },
                { label: 'Career Orientation', value: priceCareer, setter: setPriceCareer },
              ].map(({ label, value, setter }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="text-xs text-[#6b7280] w-40 flex-shrink-0">{label}</span>
                  <input
                    type="text"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
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
                  className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-2.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPrices ? '…' : 'Save Prices'}
                </button>
                {pricesSaved && (
                  <span className="text-xs text-[#1a4a3a] font-medium">Saved</span>
                )}
              </div>
            </form>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════
          Invite Member
      ══════════════════════════════════════ */}
      <section id="invite-member">
        <SectionHeading title="Invite Member" />

        <div className="bg-white border border-black/10 p-8">
          <p className="text-sm text-[#6b7280] mb-6">
            Send an invitation link by email. The new member will set their password by clicking the link.
          </p>

          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="member@email.com"
              className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {inviting ? '…' : 'Send Invite'}
            </button>
          </form>

          {inviteError && (
            <p className="text-red-600 text-xs border-l-2 border-red-400 pl-3 py-1 mt-4">{inviteError}</p>
          )}
          {inviteSuccess && (
            <p className="text-[#1a4a3a] text-xs border-l-2 border-[#1a4a3a] pl-3 py-1 mt-4">Invite sent!</p>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════
          Admin Users
      ══════════════════════════════════════ */}
      <section id="admin-users">
        <SectionHeading title="Admin Users" />

        <div className="bg-white border border-black/10 p-8 space-y-6">

          <form onSubmit={handleAddAdmin} className="flex gap-3">
            <input
              type="email"
              required
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              placeholder="new@email.com"
              className="flex-1 px-4 py-3 border border-[#e5e5e5] focus:outline-none focus:border-[#1a4a3a] text-sm text-[#0a0a0a] bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={addingAdmin}
              className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-medium tracking-wide px-6 py-3 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
                <span className="text-sm text-[#0a0a0a] font-medium">
                  {email}
                  {email === superadmin && (
                    <span className="ml-2 text-xs text-[#1a4a3a] tracking-widest uppercase">superadmin</span>
                  )}
                </span>
                {email !== superadmin && (
                  <button
                    onClick={() => handleRemoveAdmin(email)}
                    disabled={removingEmail === email}
                    className="flex-shrink-0 border border-red-300 text-red-500 hover:bg-red-500 hover:text-white text-xs font-medium tracking-wide uppercase px-4 py-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
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
