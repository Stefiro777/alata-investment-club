'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

type UpcomingEvent = {
  id: string
  title: string
  status: string
}

type Registration = {
  id: string
  nome: string
  cognome: string
  email: string
  checked_in: boolean
  checked_in_at: string | null
}

type ScanResult =
  | { kind: 'success'; nome: string; cognome: string; event_title: string }
  | { kind: 'already'; nome: string; cognome: string; checked_in_at: string }
  | { kind: 'not_found' }
  | { kind: 'error'; message: string }

// ── Registrations List Tab ────────────────────────────────────────────────────
function RegistrationsList({ eventId }: { eventId: string }) {
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends ((...args: infer A) => infer R) ? R : never | null>(null)

  async function load() {
    const supabase = createClient()
    const { data } = await supabase
      .from('event_registrations')
      .select('id, nome, cognome, email, checked_in, checked_in_at')
      .eq('event_id', eventId)
      .order('cognome')
    setRegs((data ?? []) as Registration[])
    setLoading(false)
  }

  useEffect(() => {
    setLoading(true)
    load()

    const supabase = createClient()
    const channel = supabase
      .channel(`registrations:${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_registrations', filter: `event_id=eq.${eventId}` },
        () => { load() }
      )
      .subscribe()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channelRef.current = channel as any

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function toggleCheckin(reg: Registration) {
    setToggling(reg.id)
    await fetch('/api/checkin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reg.id, checked_in: !reg.checked_in }),
    })
    // Realtime will update, but also update locally for instant feedback
    setRegs(prev => prev.map(r =>
      r.id === reg.id
        ? { ...r, checked_in: !r.checked_in, checked_in_at: !r.checked_in ? new Date().toISOString() : null }
        : r
    ))
    setToggling(null)
  }

  const presentCount = regs.filter(r => r.checked_in).length

  if (loading) return <p className="text-sm text-[#6b7280] py-10 text-center">Loading…</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium tracking-widest uppercase text-[#6b7280]">
          Presenti
        </p>
        <p className="text-2xl font-bold text-[#1a4a3a]">
          {presentCount} / {regs.length}
        </p>
      </div>

      <div className="bg-white border border-[#e5e5e5] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#f9f9f9]">
              {['Name', 'Email', 'Status', ''].map((h, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-medium text-[#6b7280] uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-[#6b7280]">No registrations.</td>
              </tr>
            ) : regs.map(r => (
              <tr key={r.id} className="border-b border-black/5 last:border-0 hover:bg-[#f9f9f9] transition-colors">
                <td className="px-4 py-3 font-medium text-[#1a1a1a] whitespace-nowrap">{r.nome} {r.cognome}</td>
                <td className="px-4 py-3 text-[#6b7280]">{r.email}</td>
                <td className="px-4 py-3">
                  {r.checked_in ? (
                    <span className="text-[10px] font-medium tracking-widest uppercase px-2 py-1 bg-[#1a4a3a] text-white">
                      Presente
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium tracking-widest uppercase px-2 py-1 border border-[#d1d5db] text-[#6b7280]">
                      Non Arrivato
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleCheckin(r)}
                    disabled={toggling === r.id}
                    className={`text-xs font-medium tracking-wide px-3 py-1.5 transition-colors disabled:opacity-40 ${
                      r.checked_in
                        ? 'border border-[#d1d5db] text-[#6b7280] hover:bg-[#f3f4f6]'
                        : 'border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white'
                    }`}
                  >
                    {toggling === r.id ? '…' : r.checked_in ? 'Revoca' : 'Check-in'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── QR Scanner Tab ────────────────────────────────────────────────────────────
function QRScannerTab() {
  const scannerRef = useRef<import('html5-qrcode').Html5Qrcode | null>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const lastTokenRef = useRef<{ token: string; ts: number } | null>(null)
  const processingRef = useRef(false)

  async function processToken(token: string) {
    if (processingRef.current) return
    const now = Date.now()
    if (lastTokenRef.current?.token === token && now - lastTokenRef.current.ts < 5000) return

    processingRef.current = true
    lastTokenRef.current = { token, ts: now }

    try {
      const res = await fetch(`/api/checkin?token=${encodeURIComponent(token)}`)
      const json = await res.json()

      if (!res.ok || json.reason === 'not_found' || json.reason === 'missing_token') {
        setScanResult({ kind: 'not_found' })
      } else if (json.reason === 'already_checked_in') {
        setScanResult({ kind: 'already', nome: json.nome, cognome: json.cognome, checked_in_at: json.checked_in_at })
      } else if (json.valid) {
        setScanResult({ kind: 'success', nome: json.nome, cognome: json.cognome, event_title: json.event_title })
      } else {
        setScanResult({ kind: 'not_found' })
      }
    } catch {
      setScanResult({ kind: 'error', message: 'Connection error' })
    }

    processingRef.current = false
  }

  const onScanSuccess = useCallback((decodedText: string) => {
    let token = decodedText
    try {
      const url = new URL(decodedText)
      token = url.searchParams.get('token') ?? decodedText
    } catch {
      // not a URL, use raw
    }
    processToken(token)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startCamera() {
    const { Html5Qrcode } = await import('html5-qrcode')
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      onScanSuccess,
      () => {}
    )
    setCameraActive(true)
  }

  async function stopCamera() {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop()
    }
    setCameraActive(false)
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  function clearResult() {
    setScanResult(null)
    processingRef.current = false
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={cameraActive ? stopCamera : startCamera}
          className={`text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors ${
            cameraActive
              ? 'border border-red-400 text-red-500 hover:bg-red-500 hover:text-white'
              : 'bg-[#1a4a3a] hover:bg-[#123a2d] text-white'
          }`}
        >
          {cameraActive ? 'Stop Camera' : 'Activate Camera'}
        </button>
        {scanResult && (
          <button
            onClick={clearResult}
            className="border border-[#d1d5db] text-[#6b7280] hover:bg-[#f3f4f6] text-xs font-medium tracking-widest uppercase px-5 py-2.5 transition-colors"
          >
            Scan Next
          </button>
        )}
      </div>

      {/* Camera container — never unmounted */}
      <div className="relative">
        <div
          id="qr-reader"
          className="w-full max-w-sm border border-[#e5e5e5] bg-[#f9f9f9]"
          style={{ minHeight: cameraActive ? 300 : 0, display: cameraActive ? 'block' : 'none' }}
        />

        {/* Overlay — stacked on top of camera */}
        {scanResult && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundColor:
                scanResult.kind === 'success' ? 'rgba(22,101,52,0.92)' :
                scanResult.kind === 'already' ? 'rgba(120,53,15,0.92)' :
                scanResult.kind === 'not_found' ? 'rgba(153,27,27,0.92)' :
                'rgba(30,41,59,0.92)',
              zIndex: 10,
            }}
          >
            <div className="text-center text-white p-6 space-y-2">
              {scanResult.kind === 'success' && (
                <>
                  <p className="text-3xl">✓</p>
                  <p className="text-xs font-bold tracking-widest uppercase">Check-in Confirmed</p>
                  <p className="text-lg font-bold">{scanResult.nome} {scanResult.cognome}</p>
                  <p className="text-xs opacity-75">{scanResult.event_title}</p>
                </>
              )}
              {scanResult.kind === 'already' && (
                <>
                  <p className="text-3xl">⚠</p>
                  <p className="text-xs font-bold tracking-widest uppercase">Already Checked In</p>
                  <p className="text-lg font-bold">{scanResult.nome} {scanResult.cognome}</p>
                  <p className="text-xs opacity-75">
                    {new Date(scanResult.checked_in_at).toLocaleTimeString('it-IT')}
                  </p>
                </>
              )}
              {scanResult.kind === 'not_found' && (
                <>
                  <p className="text-3xl">✗</p>
                  <p className="text-xs font-bold tracking-widest uppercase">Invalid QR Code</p>
                </>
              )}
              {scanResult.kind === 'error' && (
                <>
                  <p className="text-3xl">!</p>
                  <p className="text-xs font-bold tracking-widest uppercase">{scanResult.message}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Show placeholder when camera is off */}
      {!cameraActive && (
        <div className="w-full max-w-sm border border-dashed border-[#d1d5db] bg-[#f9f9f9] flex items-center justify-center" style={{ height: 240 }}>
          <p className="text-xs text-[#6b7280] uppercase tracking-widest">Camera off</p>
        </div>
      )}
    </div>
  )
}

// ── Main EventScanner Component ───────────────────────────────────────────────
export default function EventScanner() {
  const [events, setEvents] = useState<UpcomingEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [tab, setTab] = useState<'list' | 'scanner'>('list')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('upcoming_events')
      .select('id, title, status')
      .in('status', ['open', 'coming_soon'])
      .order('date')
      .then(({ data }) => setEvents((data ?? []) as UpcomingEvent[]))
  }, [])

  const selectedEvent = events.find(e => e.id === selectedEventId)

  return (
    <div className="max-w-5xl mx-auto px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest uppercase text-[#6b7280] mb-1">Admin</p>
        <h2 className="font-serif text-2xl font-bold text-[#1a4a3a]">Event Scanner</h2>
        <div className="w-8 h-px bg-[#1a4a3a] mt-2" />
      </div>

      {/* Event selector */}
      <div className="mb-8">
        <label className="block text-xs font-medium text-[#6b7280] uppercase tracking-widest mb-2">Select Event</label>
        <select
          value={selectedEventId}
          onChange={e => { setSelectedEventId(e.target.value); setTab('list') }}
          className="border border-[#d1d5db] px-3 py-2 text-sm text-[#1a1a1a] bg-white focus:outline-none focus:border-[#1a4a3a] transition-colors w-full max-w-md"
        >
          <option value="">— Select an event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Tab switcher */}
          <div className="flex border-b border-[#e5e5e5] mb-6">
            {(['list', 'scanner'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-6 py-3 text-xs font-medium tracking-widest uppercase transition-colors ${
                  tab === t
                    ? 'text-[#1a4a3a] border-b-2 border-[#1a4a3a]'
                    : 'text-[#6b7280] hover:text-[#1a1a1a] border-b-2 border-transparent'
                }`}
              >
                {t === 'list' ? 'Registrations List' : 'QR Scanner'}
              </button>
            ))}
          </div>

          {tab === 'list' && <RegistrationsList eventId={selectedEventId} />}
          {tab === 'scanner' && <QRScannerTab />}
        </>
      )}
    </div>
  )
}
