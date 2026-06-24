'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AdminNavbar from '../components/AdminNavbar'

// ── Types ─────────────────────────────────────────────────────────────────────

type MemberRow = {
  id: string
  full_name: string
  email: string
  role: string
  membership_expires_at: string | null
}

type MSettings = {
  id: string
  price_cents: number
  stripe_price_id: string | null
  description: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls   = 'w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#1a4a3a] bg-white'
const labelCls   = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1'
const btnPrimary = 'bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest px-5 py-2 transition-colors disabled:opacity-40'
const btnGhost   = 'border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:border-gray-400 transition-colors'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function memberStatus(iso: string | null): { label: string; cls: string } {
  if (!iso) return { label: 'N/D', cls: 'bg-gray-100 text-gray-500' }
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0)              return { label: 'SCADUTA',       cls: 'bg-red-100 text-red-700' }
  if (diff < 7 * 86400000)   return { label: 'IN SCADENZA',   cls: 'bg-yellow-100 text-yellow-800' }
  return                              { label: 'ATTIVA',        cls: 'bg-green-100 text-green-700' }
}

// ── KPI bar ───────────────────────────────────────────────────────────────────

function KpiBar({ members }: { members: MemberRow[] }) {
  const now = Date.now()
  const active  = members.filter(m => m.membership_expires_at && new Date(m.membership_expires_at).getTime() > now + 7 * 86400000).length
  const soon    = members.filter(m => m.membership_expires_at && new Date(m.membership_expires_at).getTime() > now && new Date(m.membership_expires_at).getTime() <= now + 7 * 86400000).length
  const expired = members.filter(m => !m.membership_expires_at || new Date(m.membership_expires_at).getTime() <= now).length

  return (
    <div className="grid grid-cols-3 gap-4 mb-10">
      {[
        { label: 'Attivi',       value: active,  color: '#1a4a3a' },
        { label: 'In scadenza',  value: soon,    color: '#b45309' },
        { label: 'Scaduti',      value: expired, color: '#b91c1c' },
      ].map(k => (
        <div key={k.label} className="border border-gray-200 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{k.label}</p>
          <p className="font-serif text-3xl font-bold" style={{ color: k.color }}>{k.value}</p>
        </div>
      ))}
    </div>
  )
}

// ── Settings form ─────────────────────────────────────────────────────────────

function SettingsPanel({ token }: { token: string }) {
  const [settings, setSettings]   = useState<MSettings | null>(null)
  const [price, setPrice]         = useState('')
  const [priceId, setPriceId]     = useState('')
  const [desc, setDesc]           = useState('')
  const [saving, setSaving]       = useState(false)
  const [saved,  setSaved]        = useState(false)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/membership/settings')
      .then(r => r.json())
      .then(d => {
        const s = d.settings as MSettings
        if (s) {
          setSettings(s)
          setPrice(((s.price_cents ?? 0) / 100).toFixed(2))
          setPriceId(s.stripe_price_id ?? '')
          setDesc(s.description ?? '')
        }
      })
  }, [])

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    const res = await fetch('/api/membership/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        price_cents: Math.round(parseFloat(price || '0') * 100),
        stripe_price_id: priceId.trim() || null,
        description: desc.trim() || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Errore'); setSaving(false); return }
    setSettings(data.settings)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border border-gray-200 p-6 mb-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] mb-5">
        Impostazioni Membership
      </p>
      <div className="grid sm:grid-cols-3 gap-4 mb-5">
        <div>
          <label className={labelCls}>Prezzo (€) *</label>
          <input type="number" min={0} step="0.01" value={price}
            onChange={e => setPrice(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Stripe Price ID</label>
          <input value={priceId} onChange={e => setPriceId(e.target.value)}
            placeholder="price_xxx" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Descrizione</label>
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Quota annuale…" className={inputCls} />
        </div>
      </div>
      {error && <p className="mb-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
      <button onClick={save} disabled={saving} className={btnPrimary}>
        {saving ? 'Salvataggio…' : saved ? '✓ Salvato' : 'Salva Impostazioni'}
      </button>
      {settings && (
        <p className="text-xs text-gray-400 mt-2">
          Ultimo aggiornamento: {settings.id ? fmtDate(new Date().toISOString()) : '—'}
        </p>
      )}
    </div>
  )
}

// ── Members table ─────────────────────────────────────────────────────────────

function MembersTable({ token }: { token: string }) {
  const [members,   setMembers]   = useState<MemberRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [editId,    setEditId]    = useState<string | null>(null)
  const [editDate,  setEditDate]  = useState('')
  const editDateRef               = useRef('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/membership/members', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setMembers((d.members ?? []) as MemberRow[]); setLoading(false) })
  }, [token])

  function startEdit(m: MemberRow) {
    const d = m.membership_expires_at ? m.membership_expires_at.slice(0, 10) : ''
    editDateRef.current = d
    setEditId(m.id)
    setEditDate(d)
  }

  async function saveExpiry(id: string) {
    setSaving(true); setError(null)
    // Read from ref first: it's always current even if React state lags behind
    const dateValue = editDateRef.current || editDate
    const iso = dateValue ? new Date(dateValue + 'T23:59:59Z').toISOString() : null
    const res = await fetch('/api/membership/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, membership_expires_at: iso }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Errore'); setSaving(false); return }
    setMembers(prev => prev.map(m => m.id === id ? { ...m, membership_expires_at: iso } : m))
    setEditId(null); setSaving(false)
  }

  if (loading) return <p className="text-sm text-gray-400">Caricamento…</p>

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] mb-4">
        Lista Membri — {members.length} totali
      </p>
      {error && <p className="mb-3 text-xs text-red-600 border-l-2 border-red-400 pl-2">{error}</p>}
      <div className="border border-gray-200">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_120px_200px_100px] gap-0 bg-gray-50 border-b border-gray-200 px-4 py-2">
          {['Nome', 'Email', 'Ruolo', 'Scadenza', 'Stato'].map(h => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{h}</p>
          ))}
        </div>
        {members.map((m, i) => {
          const status = memberStatus(m.membership_expires_at)
          const isEdit = editId === m.id
          return (
            <div key={m.id}
              className={`grid grid-cols-[1fr_1fr_120px_200px_100px] gap-0 items-center px-4 py-3 bg-white ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <p className="text-sm font-semibold text-gray-900 pr-3 truncate">{m.full_name}</p>
              <p className="text-xs text-gray-500 pr-3 truncate">{m.email}</p>
              <p className="text-xs text-gray-500 uppercase tracking-widest pr-3">{m.role}</p>
              <div className="pr-3">
                {isEdit ? (
                  <div className="flex items-center gap-2">
                    <input type="date" value={editDate}
                      onChange={e => { editDateRef.current = e.target.value; setEditDate(e.target.value) }}
                      className="border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:border-[#1a4a3a] w-32" />
                    <button onClick={() => saveExpiry(m.id)} disabled={saving}
                      className="text-xs font-semibold text-[#1a4a3a] hover:underline disabled:opacity-40">
                      {saving ? '…' : 'OK'}
                    </button>
                    <button onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:text-gray-700">✕</button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(m)}
                    className="text-xs text-gray-700 hover:text-[#1a4a3a] transition-colors text-left">
                    {fmtDate(m.membership_expires_at)} ✎
                  </button>
                )}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 ${status.cls}`}>
                {status.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MembershipAdminPage() {
  const [token, setToken]     = useState<string | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [email,   setEmail]   = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      setEmail(session.user?.email ?? '')

      // Load members for KPI
      const res = await fetch('/api/membership/members', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const d = await res.json()
      setMembers((d.members ?? []) as MemberRow[])
    }
    init()
  }, [])

  if (!token) {
    return (
      <>
        <AdminNavbar userEmail="" />
        <div className="max-w-5xl mx-auto px-8 py-12">
          <p className="text-sm text-gray-400">Caricamento…</p>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminNavbar userEmail={email} />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10" style={{ fontFamily: 'Inter, sans-serif' }}>

        <div className="mb-10">
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Membership</h1>
          <div className="w-8 h-px bg-[#1a4a3a]" />
        </div>

        <KpiBar members={members} />
        <SettingsPanel token={token} />
        <MembersTable token={token} />
      </div>
    </>
  )
}
