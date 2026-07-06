'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuoteItem { description: string; qty: number; unit_price: number }
interface QuoteData {
  number: string
  issued_at: string
  recipient_name: string
  recipient_email: string
  recipient_org: string
  subject: string
  items: QuoteItem[]
  notes: string
}
interface SavedQuote {
  id: string; number: string; recipient_name: string; recipient_email: string | null
  recipient_org: string | null; subject: string; total: number; issued_at: string
  items: QuoteItem[]; notes: string | null
}

function fmtEur(n: number) { return `€${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function today() { return new Date().toISOString().slice(0, 10) }

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

// ── Live PDF preview (HTML approximation) ─────────────────────────────────────

function QuotePreview({ q }: { q: QuoteData }) {
  const total = q.items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0)
  const fmtDate = (d: string) => {
    const dt = new Date(d)
    const MONTHS = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre']
    return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontSize: 13, color: '#000', minHeight: 780, padding: 0 }}>
      {/* Header */}
      <div style={{ background: 'var(--forest)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>ALATA INVESTMENT CLUB</p>
            <p style={{ margin: '2px 0 0', fontSize: 8, color: '#b8d4c8' }}>alatainvestmentclub.com</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>PREVENTIVO</p>
            <p style={{ margin: '3px 0 0', fontSize: 9, color: '#b8d4c8' }}>{q.number || 'ALATA-XXXX-XXX'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 9, color: '#b8d4c8' }}>{q.issued_at ? fmtDate(q.issued_at) : ''}</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/white.png" alt="Alata" style={{ height: 36, width: 'auto' }} />
        </div>
      </div>

      <div style={{ padding: '18px 24px' }}>
        {/* Subject */}
        {q.subject && <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Oggetto: {q.subject}</p>}

        {/* Sender / Recipient */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Mittente</p>
            <p style={{ margin: '0 0 2px', fontSize: 10 }}>Alata Investment Club</p>
            <p style={{ margin: 0, fontSize: 10 }}>info@alatainvestmentclub.com</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Destinatario</p>
            {q.recipient_name && <p style={{ margin: '0 0 2px', fontSize: 10 }}>{q.recipient_name}</p>}
            {q.recipient_org  && <p style={{ margin: '0 0 2px', fontSize: 10 }}>{q.recipient_org}</p>}
            {q.recipient_email && <p style={{ margin: 0, fontSize: 10 }}>{q.recipient_email}</p>}
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, marginBottom: 0 }}>
          <thead>
            <tr style={{ background: 'var(--forest)', color: '#fff' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: 9 }}>DESCRIZIONE</th>
              <th style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 700, fontSize: 9, width: 40 }}>QTÀ</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, fontSize: 9, width: 90 }}>PREZZO UNIT.</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 700, fontSize: 9, width: 90 }}>TOTALE</th>
            </tr>
          </thead>
          <tbody>
            {q.items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? '#f8f8f8' : '#fff' }}>
                <td style={{ padding: '6px 8px' }}>{item.description}</td>
                <td style={{ padding: '6px 6px', textAlign: 'center' }}>{item.qty}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmtEur(item.unit_price)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmtEur((item.qty || 0) * (item.unit_price || 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#edf7f0', borderTop: '2px solid #1a4a3a' }}>
              <td colSpan={3} style={{ padding: '8px', fontWeight: 700, fontSize: 11 }}>TOTALE PREVENTIVO</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontSize: 11 }}>{fmtEur(total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes */}
        {q.notes && (
          <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #e5e5e5' }}>
            <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Note e Condizioni</p>
            <p style={{ fontSize: 9, lineHeight: 1.5, margin: 0 }}>{q.notes}</p>
          </div>
        )}

        {/* Signature */}
        <div style={{ marginTop: 30, paddingTop: 10, borderTop: '1px solid #1a4a3a' }}>
          <p style={{ fontWeight: 700, fontSize: 9, margin: '0 0 4px' }}>Alata Investment Club</p>
          <p style={{ fontSize: 8, color: '#777', margin: 0 }}>alatainvestmentclub.com — info@alatainvestmentclub.com</p>
        </div>
      </div>
    </div>
  )
}

// ── Send email modal ──────────────────────────────────────────────────────────

function SendModal({ quote, onClose }: { quote: QuoteData; onClose: () => void }) {
  const [to,      setTo]      = useState(quote.recipient_email)
  const [subject, setSubject] = useState(`Preventivo ${quote.number} — Alata Investment Club`)
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [err,     setErr]     = useState('')

  async function send() {
    setSending(true); setErr('')
    try {
      const token = await getToken()
      const res = await fetch('/api/finance/quotes/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to, subject, quote }),
      }).then(r => r.json())
      if (res.error) { setErr(res.error) } else { setSent(true) }
    } finally { setSending(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-[51] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md shadow-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold uppercase tracking-widest">Invia via Email</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors">✕</button>
          </div>
          {sent ? (
            <div className="text-center py-6">
              <p className="text-green-700 font-semibold">Email inviata con successo!</p>
              <button onClick={onClose} className="mt-4 px-6 py-2 bg-forest text-white text-xs font-semibold uppercase tracking-widest">Chiudi</button>
            </div>
          ) : (
            <div className="space-y-4">
              {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{err}</p>}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Destinatario email</label>
                <input value={to} onChange={e => setTo(e.target.value)} type="email"
                  className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Oggetto</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={send} disabled={sending || !to}
                  className="flex-1 py-3 bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
                  {sending ? 'Invio...' : 'Invia con allegato PDF'}
                </button>
                <button onClick={onClose} className="px-4 py-3 border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">Annulla</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Quote form ────────────────────────────────────────────────────────────────

function emptyQuote(): QuoteData {
  return {
    number: '', issued_at: today(),
    recipient_name: '', recipient_email: '', recipient_org: '',
    subject: '', items: [{ description: '', qty: 1, unit_price: 0 }], notes: '',
  }
}

function QuoteForm({ onSaved }: { onSaved: () => void }) {
  const [q,         setQ]         = useState<QuoteData>(emptyQuote())
  const [saving,    setSaving]    = useState(false)
  const [sending,   setSending]   = useState(false)
  const [showSend,  setShowSend]  = useState(false)
  const [err,       setErr]       = useState('')
  const [savedQuote, setSavedQuote] = useState<QuoteData | null>(null)

  const total = q.items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0)

  function setItem(idx: number, field: keyof QuoteItem, value: string | number) {
    const items = [...q.items]
    items[idx] = { ...items[idx], [field]: value }
    setQ(prev => ({ ...prev, items }))
  }

  function addItem() { setQ(prev => ({ ...prev, items: [...prev.items, { description: '', qty: 1, unit_price: 0 }] })) }
  function removeItem(idx: number) { setQ(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) })) }

  async function save() {
    if (!q.recipient_name || !q.subject) { setErr('Destinatario e oggetto obbligatori'); return }
    setSaving(true); setErr('')
    try {
      const token = await getToken()
      const res = await fetch('/api/finance/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(q),
      }).then(r => r.json())
      if (res.error) { setErr(res.error); return }
      // Update the number from the saved quote
      setQ(prev => ({ ...prev, number: res.quote.number }))
      setSavedQuote({ ...q, number: res.quote.number })
      onSaved()
    } finally { setSaving(false) }
  }

  async function downloadPDF() {
    setSending(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/finance/quotes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(q),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `preventivo-${q.number || 'bozza'}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setSending(false) }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      {/* Form */}
      <div className="space-y-5">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-forest mb-3">Destinatario</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Nome *</label>
              <input value={q.recipient_name} onChange={e => setQ(p => ({ ...p, recipient_name: e.target.value }))}
                className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
              <input type="email" value={q.recipient_email} onChange={e => setQ(p => ({ ...p, recipient_email: e.target.value }))}
                className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Organizzazione</label>
              <input value={q.recipient_org} onChange={e => setQ(p => ({ ...p, recipient_org: e.target.value }))}
                className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-forest mb-3">Dettagli</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">Oggetto preventivo *</label>
              <input value={q.subject} onChange={e => setQ(p => ({ ...p, subject: e.target.value }))}
                className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">Data emissione</label>
              <input type="date" value={q.issued_at} onChange={e => setQ(p => ({ ...p, issued_at: e.target.value }))}
                className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest" />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-forest">Voci</h3>
            <button onClick={addItem}
              className="text-xs font-semibold uppercase tracking-widest text-forest border border-forest px-3 py-1 hover:bg-forest hover:text-white transition-colors">
              + Aggiungi voce
            </button>
          </div>
          <div className="space-y-2">
            {q.items.map((item, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input
                  placeholder="Descrizione"
                  value={item.description}
                  onChange={e => setItem(i, 'description', e.target.value)}
                  className="flex-1 border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:border-forest"
                />
                <input
                  type="number" min={1} placeholder="Qtà"
                  value={item.qty}
                  onChange={e => setItem(i, 'qty', Number(e.target.value))}
                  className="w-16 border border-gray-300 px-2 py-2 text-sm text-center focus:outline-none focus:border-forest"
                />
                <input
                  type="number" min={0} step={0.01} placeholder="Prezzo"
                  value={item.unit_price}
                  onChange={e => setItem(i, 'unit_price', Number(e.target.value))}
                  className="w-28 border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:border-forest"
                />
                <span className="pt-2 text-sm font-semibold text-gray-700 w-20 text-right">
                  {fmtEur((item.qty || 0) * (item.unit_price || 0))}
                </span>
                {q.items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="pt-2 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none">×</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm font-bold">Totale: {fmtEur(total)}</p>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wide">Note / Condizioni</label>
          <textarea value={q.notes} onChange={e => setQ(p => ({ ...p, notes: e.target.value }))}
            rows={3} placeholder="Condizioni di pagamento, scadenza del preventivo, ecc."
            className="w-full mt-1 border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-forest resize-none" />
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{err}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={save} disabled={saving}
            className="px-5 py-3 bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
            {saving ? 'Salvo...' : 'Salva preventivo'}
          </button>
          <button onClick={downloadPDF} disabled={sending || !q.subject}
            className="px-5 py-3 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
            {sending ? 'Generazione...' : 'Scarica PDF'}
          </button>
          <button onClick={() => setShowSend(true)} disabled={!q.subject}
            className="px-5 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold uppercase tracking-widest disabled:opacity-50 transition-colors">
            Invia via Email
          </button>
        </div>
      </div>

      {/* Preview */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Anteprima</h3>
        <div className="overflow-auto max-h-[700px] border border-gray-200">
          <QuotePreview q={q} />
        </div>
      </div>

      {showSend && <SendModal quote={q} onClose={() => setShowSend(false)} />}
    </div>
  )
}

// ── Quotes history ────────────────────────────────────────────────────────────

function QuotesHistory({ reloadTrigger }: { reloadTrigger?: number }) {
  const [quotes,  setQuotes]  = useState<SavedQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [dlding,  setDlding]  = useState<string | null>(null)
  const [showSend, setShowSend] = useState<SavedQuote | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)
    const token = await getToken()
    console.log('[QuotesHistory] token present:', !!token)
    const res = await fetch('/api/finance/quotes', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    console.log('[QuotesHistory] GET /api/finance/quotes →', res.status, data)
    if (!res.ok) {
      setFetchErr(data?.error ?? `Errore ${res.status}`)
      setLoading(false)
      return
    }
    setQuotes(data.quotes ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, reloadTrigger])

  async function downloadPDF(q: SavedQuote) {
    setDlding(q.id)
    try {
      const token = await getToken()
      const res = await fetch('/api/finance/quotes/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...q, issued_at: q.issued_at, notes: q.notes ?? '' }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `preventivo-${q.number}.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally { setDlding(null) }
  }

  if (loading) return <p className="text-sm text-gray-400">Caricamento...</p>
  if (fetchErr) return (
    <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-3">
      Errore nel caricamento dei preventivi: {fetchErr}
      <button onClick={load} className="ml-3 underline">Riprova</button>
    </div>
  )
  if (!quotes.length) return <p className="text-sm text-gray-400">Nessun preventivo ancora.</p>

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr className="border-b border-gray-200">
              {['Numero','Destinatario','Soggetto','Totale','Data','Azioni'].map(h => (
                <th key={h} className="text-left py-2 pr-6 text-xs font-semibold uppercase tracking-widest text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 pr-4 font-mono text-xs font-semibold text-forest">{q.number}</td>
                <td className="py-3 pr-4">
                  <p className="font-medium text-gray-900">{q.recipient_name}</p>
                  {q.recipient_org && <p className="text-xs text-gray-500">{q.recipient_org}</p>}
                </td>
                <td className="py-3 pr-4 text-gray-700 max-w-[200px] truncate">{q.subject}</td>
                <td className="py-3 pr-4 font-semibold">{fmtEur(q.total)}</td>
                <td className="py-3 pr-4 text-gray-500 text-xs">{new Date(q.issued_at).toLocaleDateString('it-IT')}</td>
                <td className="py-3">
                  <div className="flex gap-2">
                    <button onClick={() => downloadPDF(q)} disabled={dlding === q.id}
                      className="text-xs font-semibold uppercase tracking-widest text-forest border border-forest px-3 py-1 hover:bg-forest hover:text-white transition-colors disabled:opacity-50">
                      {dlding === q.id ? '...' : 'PDF'}
                    </button>
                    <button onClick={() => setShowSend(q)}
                      className="text-xs font-semibold uppercase tracking-widest text-gray-600 border border-gray-300 px-3 py-1 hover:bg-gray-100 transition-colors">
                      Email
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showSend && (
        <SendModal
          quote={{
            number: showSend.number, issued_at: showSend.issued_at,
            recipient_name: showSend.recipient_name, recipient_email: showSend.recipient_email ?? '',
            recipient_org: showSend.recipient_org ?? '', subject: showSend.subject,
            items: showSend.items, notes: showSend.notes ?? '',
          }}
          onClose={() => setShowSend(null)}
        />
      )}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QuoteClient() {
  const [tab, setTab] = useState<'nuovo' | 'storico'>('nuovo')
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div>
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-6">
          {(['nuovo', 'storico'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="pb-2 text-sm font-['Inter'] transition-colors capitalize"
              style={tab === t
                ? { borderBottom: '2px solid #1a4a3a', color: 'var(--forest)', fontWeight: 600 }
                : { borderBottom: '2px solid transparent', color: '#9ca3af' }}>
              {t === 'nuovo' ? 'Nuovo preventivo' : 'Preventivi inviati'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'nuovo'
        ? <QuoteForm key={refreshKey} onSaved={() => setRefreshKey(k => k + 1)} />
        : <QuotesHistory reloadTrigger={refreshKey} />}
    </div>
  )
}
