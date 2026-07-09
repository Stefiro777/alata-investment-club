'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FileUploadButton from '@/app/components/FileUploadButton'
import { getRoleColor } from '@/lib/hackathon-colors'
import { appendDiligenceMessage, useDiligenceRealtime } from '@/lib/hackathon-realtime'

const STORAGE_KEY = 'alata_hackathon_participant_id'
const POLL_INTERVAL_MS = 30000

const ROLE_LABELS: Record<string, string> = {
  sell_side: 'Sell-Side Advisor',
  buy_side_1: 'Buy-Side Bidder 1',
  buy_side_2: 'Buy-Side Bidder 2',
  buy_side_3: 'Buy-Side Bidder 3',
}

type Material = { id: string; title: string; url: string | null }

type ParticipantState = {
  participant_id: string
  name: string
  role_key: string
  case_name: string | null
  current_phase: number
  mandate: string | null
  materials: Material[]
}

type DiligenceMessage = {
  id: string
  sender_role: string
  message: string
  attachment_url: string | null
  created_at: string
}

type DiligenceRoom = {
  id: string
  buy_side_role: string
  messages: DiligenceMessage[]
}

type Submission = {
  id: string
  phase_number: number
  file_path: string | null
  deal_structure: Record<string, unknown> | null
  submitted_at: string
}

type Step = 'code' | 'name' | 'dashboard'

const DEAL_STRUCTURE_TYPES = ['cash', 'earn-out', 'vendor loan', 'rollover'] as const

export default function HackathonClient() {
  const [step, setStep] = useState<Step>('code')
  const [accessCode, setAccessCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(true)

  const [participant, setParticipant] = useState<ParticipantState | null>(null)
  const [rooms, setRooms] = useState<DiligenceRoom[]>([])
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({})
  const [attachmentDrafts, setAttachmentDrafts] = useState<Record<string, File | null>>({})
  const [sendingRoom, setSendingRoom] = useState<string | null>(null)

  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionFile, setSubmissionFile] = useState<File | null>(null)
  const [dealStructureType, setDealStructureType] = useState<string>(DEAL_STRUCTURE_TYPES[0])
  const [cashPct, setCashPct] = useState('')
  const [earnoutPct, setEarnoutPct] = useState('')
  const [vendorLoanPct, setVendorLoanPct] = useState('')
  const [rolloverPct, setRolloverPct] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [submissionSaved, setSubmissionSaved] = useState(false)

  const participantIdRef = useRef<string | null>(null)

  const loadParticipant = useCallback(async (participantId: string) => {
    const res = await fetch(`/api/hackathon/participant/${participantId}`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Errore nel caricamento dello stato')
    return data as ParticipantState
  }, [])

  const loadRooms = useCallback(async (participantId: string) => {
    const res = await fetch(`/api/hackathon/participant/${participantId}/diligence-rooms`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Errore nel caricamento delle stanze')
    return data.rooms as DiligenceRoom[]
  }, [])

  const loadSubmissions = useCallback(async (participantId: string) => {
    const res = await fetch(`/api/hackathon/participant/${participantId}/submissions`)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Errore nel caricamento delle submission')
    return data.submissions as Submission[]
  }, [])

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      setRestoring(false)
      return
    }
    participantIdRef.current = saved
    ;(async () => {
      try {
        const state = await loadParticipant(saved)
        setParticipant(state)
        const roomsData = await loadRooms(saved)
        setRooms(roomsData)
        const submissionsData = await loadSubmissions(saved)
        setSubmissions(submissionsData)
        setStep('dashboard')
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setRestoring(false)
      }
    })()
  }, [loadParticipant, loadRooms, loadSubmissions])

  // Polling for phase/material updates + diligence rooms
  useEffect(() => {
    if (step !== 'dashboard' || !participant) return

    const interval = setInterval(async () => {
      const participantId = participantIdRef.current
      if (!participantId) return
      try {
        const state = await loadParticipant(participantId)
        setParticipant(state)
        const roomsData = await loadRooms(participantId)
        setRooms(roomsData)
        const submissionsData = await loadSubmissions(participantId)
        setSubmissions(submissionsData)
      } catch {
        // silent retry on next tick
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [step, participant, loadParticipant, loadRooms, loadSubmissions])

  const roomIds = useMemo(() => rooms.map((r) => r.id), [rooms])

  useDiligenceRealtime(
    roomIds,
    useCallback((roomId: string, message: DiligenceMessage) => {
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId ? { ...room, messages: appendDiligenceMessage(room.messages, message) } : room
        )
      )
    }, [])
  )

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/hackathon/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: accessCode.trim(), name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la registrazione')
      }
      localStorage.setItem(STORAGE_KEY, data.participant_id)
      participantIdRef.current = data.participant_id
      const state = await loadParticipant(data.participant_id)
      setParticipant(state)
      const roomsData = await loadRooms(data.participant_id)
      setRooms(roomsData)
      const submissionsData = await loadSubmissions(data.participant_id)
      setSubmissions(submissionsData)
      setStep('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendMessage(roomId: string) {
    const participantId = participantIdRef.current
    if (!participantId) return
    const text = messageDrafts[roomId]?.trim() ?? ''
    const file = attachmentDrafts[roomId] ?? null
    if (!text && !file) return

    setSendingRoom(roomId)
    try {
      const formData = new FormData()
      formData.set('message', text)
      if (file) formData.set('attachment', file)

      const res = await fetch(
        `/api/hackathon/participant/${participantId}/diligence-rooms/${roomId}/messages`,
        { method: 'POST', body: formData }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore nell\'invio del messaggio')

      setMessageDrafts((prev) => ({ ...prev, [roomId]: '' }))
      setAttachmentDrafts((prev) => ({ ...prev, [roomId]: null }))
      const roomsData = await loadRooms(participantId)
      setRooms(roomsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSendingRoom(null)
    }
  }

  async function handleSubmitPhase(e: React.FormEvent) {
    e.preventDefault()
    const participantId = participantIdRef.current
    if (!participantId || !participant) return
    setSubmissionError(null)
    setSubmissionSaved(false)

    if (!submissionFile && participant.current_phase !== 4) return

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.set('phase_number', String(participant.current_phase))
      if (submissionFile) formData.set('file', submissionFile)

      if (participant.current_phase === 4) {
        formData.set(
          'deal_structure',
          JSON.stringify({
            type: dealStructureType,
            cash_pct: cashPct ? Number(cashPct) : null,
            earnout_pct: earnoutPct ? Number(earnoutPct) : null,
            vendor_loan_pct: vendorLoanPct ? Number(vendorLoanPct) : null,
            rollover_pct: rolloverPct ? Number(rolloverPct) : null,
          })
        )
      }

      const res = await fetch(`/api/hackathon/participant/${participantId}/submissions`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore nell\'invio della submission')

      setSubmissionFile(null)
      setSubmissionSaved(true)
      const submissionsData = await loadSubmissions(participantId)
      setSubmissions(submissionsData)
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  if (restoring) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper">
        <p className="font-sans text-ink-500">Loading…</p>
      </main>
    )
  }

  if (step !== 'dashboard') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-forest mb-8 text-center">M&amp;A Hackathon</h1>

          {step === 'code' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!accessCode.trim()) return
                setError(null)
                setStep('name')
              }}
              className="space-y-4"
            >
              <label className="block font-sans text-sm text-ink-700">
                Access code
                <input
                  autoFocus
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="mt-2 w-full border border-line px-4 py-3 font-sans text-ink-900 focus:outline-none focus:border-forest"
                  placeholder="Enter access code"
                />
              </label>
              <button
                type="submit"
                className="w-full bg-forest text-white font-sans py-3 hover:bg-forest-deep transition-colors"
              >
                Enter
              </button>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <label className="block font-sans text-sm text-ink-700">
                Your name
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full border border-line px-4 py-3 font-sans text-ink-900 focus:outline-none focus:border-forest"
                  placeholder="Enter your name"
                />
              </label>
              {error && <p className="text-sm text-red-700 font-sans">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-forest text-white font-sans py-3 hover:bg-forest-deep transition-colors disabled:opacity-50"
              >
                {loading ? 'Joining…' : 'Join'}
              </button>
              <button
                type="button"
                onClick={() => setStep('code')}
                className="w-full font-sans text-sm text-ink-500 underline-grow"
              >
                Back
              </button>
            </form>
          )}
        </div>
      </main>
    )
  }

  if (!participant) return null

  return (
    <main className="min-h-screen bg-paper px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl space-y-10">
        <header className="text-center space-y-3">
          <span className="inline-block bg-forest text-white font-sans text-xs tracking-widest uppercase px-4 py-2">
            {ROLE_LABELS[participant.role_key] ?? participant.role_key}
          </span>
          <h1 className="font-serif text-3xl text-ink-900">{participant.case_name ?? 'M&A Hackathon'}</h1>
          <p className="font-sans text-sm text-ink-500">{participant.name}</p>
        </header>

        {participant.current_phase === 0 ? (
          <section className="border border-line px-6 py-10 text-center">
            <p className="font-serif text-xl text-forest">In attesa che l&apos;evento inizi</p>
            <p className="font-sans text-sm text-ink-500 mt-2">
              Questa pagina si aggiornerà automaticamente non appena l&apos;evento comincerà.
            </p>
          </section>
        ) : (
          <>
            <section className="border border-line px-6 py-6">
              <h2 className="font-serif text-2xl text-forest mb-4">Il tuo mandato</h2>
              <p className="font-sans text-ink-700 whitespace-pre-wrap leading-relaxed">
                {participant.mandate ?? 'Nessun mandato disponibile al momento.'}
              </p>
            </section>

            <section className="border border-line px-6 py-6">
              <h2 className="font-serif text-2xl text-forest mb-4">
                Materiali — Fase {participant.current_phase}
              </h2>
              {participant.materials.length === 0 ? (
                <p className="font-sans text-sm text-ink-500">Nessun materiale disponibile per questa fase.</p>
              ) : (
                <ul className="space-y-2">
                  {participant.materials.map((m) => (
                    <li key={m.id}>
                      {m.url ? (
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-sans text-forest underline-grow"
                        >
                          {m.title}
                        </a>
                      ) : (
                        <span className="font-sans text-ink-500">{m.title} (link non disponibile)</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="border border-line px-6 py-6">
              <h2 className="font-serif text-2xl text-forest mb-4">Submit — Phase {participant.current_phase}</h2>

              {submissions.some((s) => s.phase_number === participant.current_phase) && (
                <p className="font-sans text-xs text-ink-500 mb-3">
                  You already submitted for this phase — submitting again will replace it.
                </p>
              )}

              <form onSubmit={handleSubmitPhase} className="space-y-4">
                <FileUploadButton value={submissionFile} onChange={setSubmissionFile} />

                {participant.current_phase === 4 && (
                  <div className="space-y-3 border-t border-line-faint pt-4">
                    <p className="font-sans text-xs tracking-widest uppercase text-ink-500">Deal structure (LOI)</p>
                    <label className="block font-sans text-sm text-ink-700">
                      Structure type
                      <select
                        value={dealStructureType}
                        onChange={(e) => setDealStructureType(e.target.value)}
                        className="mt-1 w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                      >
                        {DEAL_STRUCTURE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block font-sans text-xs text-ink-500">
                        Cash %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={cashPct}
                          onChange={(e) => setCashPct(e.target.value)}
                          className="mt-1 w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                        />
                      </label>
                      <label className="block font-sans text-xs text-ink-500">
                        Earn-out %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={earnoutPct}
                          onChange={(e) => setEarnoutPct(e.target.value)}
                          className="mt-1 w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                        />
                      </label>
                      <label className="block font-sans text-xs text-ink-500">
                        Vendor loan %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={vendorLoanPct}
                          onChange={(e) => setVendorLoanPct(e.target.value)}
                          className="mt-1 w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                        />
                      </label>
                      <label className="block font-sans text-xs text-ink-500">
                        Rollover %
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rolloverPct}
                          onChange={(e) => setRolloverPct(e.target.value)}
                          className="mt-1 w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {submissionError && <p className="text-sm text-red-700 font-sans">{submissionError}</p>}
                {submissionSaved && <p className="text-sm text-forest font-sans">Submission saved.</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-forest text-white font-sans text-sm px-5 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            </section>
          </>
        )}

        <section className="space-y-6">
          <h2 className="font-serif text-2xl text-forest">Diligence</h2>
          {rooms.length === 0 ? (
            <p className="font-sans text-sm text-ink-500">Nessuna stanza di diligence disponibile.</p>
          ) : (
            rooms.map((room) => (
              <div
                key={room.id}
                className="border border-line px-6 py-6 space-y-4"
                style={{ borderLeft: `3px solid ${getRoleColor(room.buy_side_role)}` }}
              >
                <h3
                  className="font-sans text-xs tracking-widest uppercase"
                  style={{ color: getRoleColor(room.buy_side_role) }}
                >
                  {ROLE_LABELS[room.buy_side_role] ?? room.buy_side_role}
                </h3>

                <div className="space-y-3 max-h-72 overflow-y-auto">
                  {room.messages.length === 0 ? (
                    <p className="font-sans text-sm text-ink-500">Nessun messaggio ancora.</p>
                  ) : (
                    room.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="border-b border-line-faint pb-2 pl-3"
                        style={{ borderLeft: `2px solid ${getRoleColor(msg.sender_role)}` }}
                      >
                        <p className="font-sans text-xs" style={{ color: getRoleColor(msg.sender_role) }}>
                          {ROLE_LABELS[msg.sender_role] ?? msg.sender_role}
                        </p>
                        {msg.message && <p className="font-sans text-ink-900">{msg.message}</p>}
                        {msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-sans text-sm text-forest underline-grow"
                          >
                            Allegato
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSendMessage(room.id)
                  }}
                  className="space-y-2"
                >
                  <textarea
                    value={messageDrafts[room.id] ?? ''}
                    onChange={(e) =>
                      setMessageDrafts((prev) => ({ ...prev, [room.id]: e.target.value }))
                    }
                    className="w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                    placeholder="Write a message…"
                    rows={2}
                  />
                  <div className="flex items-center gap-3">
                    <FileUploadButton
                      value={attachmentDrafts[room.id] ?? null}
                      onChange={(file) =>
                        setAttachmentDrafts((prev) => ({ ...prev, [room.id]: file }))
                      }
                      className="flex-1"
                    />
                    <button
                      type="submit"
                      disabled={sendingRoom === room.id}
                      className="bg-forest text-white font-sans text-sm px-5 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {sendingRoom === room.id ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            ))
          )}
        </section>

        {error && <p className="text-sm text-red-700 font-sans text-center">{error}</p>}
      </div>
    </main>
  )
}
