'use client'

import { useCallback, useEffect, useState } from 'react'
import FileUploadButton from '@/app/components/FileUploadButton'
import { getRoleColor } from '@/lib/hackathon-colors'

const MAX_PHASE = 6
const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const
const ROLE_LABELS: Record<string, string> = {
  sell_side: 'Sell-Side',
  buy_side_1: 'Buy-Side 1',
  buy_side_2: 'Buy-Side 2',
  buy_side_3: 'Buy-Side 3',
}

type Session = {
  id: string
  case_name: string
  access_code: string
  judge_code: string
  status: 'draft' | 'active' | 'closed'
  current_phase: number
  created_at: string
}

type Participant = { id: string; name: string; role_key: string; joined_at: string }
type Material = { id: string; phase_number: number; role_key: string; title: string; file_path: string }
type Mandate = { role_key: string; content: string }
type FairValue = { content: string; valuation_range: string }
type DiligenceMessage = {
  id: string
  sender_role: string
  message: string
  attachment_url: string | null
  created_at: string
}
type DiligenceRoom = { id: string; buy_side_role: string; messages: DiligenceMessage[] }
type LeaderboardEntry = { role_key: string; weighted_score: number | null }
type Leaderboard = { buy_side: LeaderboardEntry[]; sell_side: { weighted_score: number | null } }

type TabType = 'participants' | 'materials' | 'mandates' | 'fair_value' | 'diligence' | 'leaderboard'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="w-3.5 h-3.5 text-ink-400 transition-transform duration-200 flex-shrink-0"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function Collapsible({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-line-faint p-6">
      <button type="button" onClick={onToggle} className="flex items-center gap-3 group w-full text-left">
        <p className="text-xs tracking-[0.2em] uppercase text-ink-500">{title}</p>
        <Chevron open={open} />
      </button>
      <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.25s ease' }}>
        <div style={{ overflow: 'hidden' }}>
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data as T
}

export default function HackathonAdminClient() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionsOpen, setSessionsOpen] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [sessionsError, setSessionsError] = useState<string | null>(null)

  const [caseName, setCaseName] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [judgeCode, setJudgeCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('participants')

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) ?? null

  const [phaseSaving, setPhaseSaving] = useState(false)

  const [participants, setParticipants] = useState<Participant[]>([])
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({})
  const [participantsLoading, setParticipantsLoading] = useState(false)
  const [participantsError, setParticipantsError] = useState<string | null>(null)

  const [materials, setMaterials] = useState<Material[]>([])
  const [materialsLoading, setMaterialsLoading] = useState(false)
  const [materialsError, setMaterialsError] = useState<string | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadPhase, setUploadPhase] = useState('1')
  const [uploadRole, setUploadRole] = useState<string>(ROLES[0])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const [mandates, setMandates] = useState<Mandate[]>([])
  const [mandatesLoading, setMandatesLoading] = useState(false)
  const [mandatesError, setMandatesError] = useState<string | null>(null)
  const [savingMandates, setSavingMandates] = useState(false)

  const [fairValue, setFairValue] = useState<FairValue>({ content: '', valuation_range: '' })
  const [fairValueLoading, setFairValueLoading] = useState(false)
  const [fairValueError, setFairValueError] = useState<string | null>(null)
  const [savingFairValue, setSavingFairValue] = useState(false)

  const [diligenceRooms, setDiligenceRooms] = useState<DiligenceRoom[]>([])
  const [diligenceLoading, setDiligenceLoading] = useState(false)
  const [diligenceError, setDiligenceError] = useState<string | null>(null)

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    setSessionsError(null)
    try {
      const data = await jsonFetch<{ sessions: Session[] }>('/api/admin/hackathon/sessions')
      setSessions(data.sessions)
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!caseName.trim() || !accessCode.trim() || !judgeCode.trim()) return
    setCreating(true)
    try {
      const data = await jsonFetch<{ session: Session }>('/api/admin/hackathon/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_name: caseName.trim(), access_code: accessCode.trim(), judge_code: judgeCode.trim() }),
      })
      setSessions((prev) => [data.session, ...prev])
      setCaseName('')
      setAccessCode('')
      setJudgeCode('')
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(sessionId: string, status: Session['status']) {
    try {
      const data = await jsonFetch<{ session: Session }>(`/api/admin/hackathon/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? data.session : s)))
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : 'Errore imprevisto')
    }
  }

  async function handlePhaseChange(delta: number) {
    if (!selectedSession) return
    const nextPhase = Math.min(MAX_PHASE, Math.max(0, selectedSession.current_phase + delta))
    if (nextPhase === selectedSession.current_phase) return
    setPhaseSaving(true)
    try {
      const data = await jsonFetch<{ session: Session }>(`/api/admin/hackathon/sessions/${selectedSession.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_phase: nextPhase }),
      })
      setSessions((prev) => prev.map((s) => (s.id === data.session.id ? data.session : s)))
    } catch (err) {
      setSessionsError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setPhaseSaving(false)
    }
  }

  const loadParticipants = useCallback(async (sessionId: string) => {
    setParticipantsLoading(true)
    setParticipantsError(null)
    try {
      const data = await jsonFetch<{ participants: Participant[]; counts: Record<string, number> }>(
        `/api/admin/hackathon/sessions/${sessionId}/participants`
      )
      setParticipants(data.participants)
      setParticipantCounts(data.counts)
    } catch (err) {
      setParticipantsError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setParticipantsLoading(false)
    }
  }, [])

  const loadMaterials = useCallback(async (sessionId: string) => {
    setMaterialsLoading(true)
    setMaterialsError(null)
    try {
      const data = await jsonFetch<{ materials: Material[] }>(`/api/admin/hackathon/sessions/${sessionId}/materials`)
      setMaterials(data.materials)
    } catch (err) {
      setMaterialsError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setMaterialsLoading(false)
    }
  }, [])

  const loadMandates = useCallback(async (sessionId: string) => {
    setMandatesLoading(true)
    setMandatesError(null)
    try {
      const data = await jsonFetch<{ mandates: Mandate[] }>(`/api/admin/hackathon/sessions/${sessionId}/mandates`)
      setMandates(data.mandates)
    } catch (err) {
      setMandatesError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setMandatesLoading(false)
    }
  }, [])

  const loadFairValue = useCallback(async (sessionId: string) => {
    setFairValueLoading(true)
    setFairValueError(null)
    try {
      const data = await jsonFetch<{ fair_value: FairValue }>(`/api/admin/hackathon/sessions/${sessionId}/fair-value`)
      setFairValue(data.fair_value)
    } catch (err) {
      setFairValueError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setFairValueLoading(false)
    }
  }, [])

  const loadDiligence = useCallback(async (sessionId: string) => {
    setDiligenceLoading(true)
    setDiligenceError(null)
    try {
      const data = await jsonFetch<{ rooms: DiligenceRoom[] }>(`/api/admin/hackathon/sessions/${sessionId}/diligence-overview`)
      setDiligenceRooms(data.rooms)
    } catch (err) {
      setDiligenceError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setDiligenceLoading(false)
    }
  }, [])

  const loadLeaderboard = useCallback(async (sessionId: string) => {
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    try {
      const data = await jsonFetch<Leaderboard>(`/api/hackathon/judge/${sessionId}/leaderboard`)
      setLeaderboard(data)
    } catch (err) {
      setLeaderboardError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedSessionId) return
    if (activeTab === 'participants') loadParticipants(selectedSessionId)
    if (activeTab === 'materials') loadMaterials(selectedSessionId)
    if (activeTab === 'mandates') loadMandates(selectedSessionId)
    if (activeTab === 'fair_value') loadFairValue(selectedSessionId)
    if (activeTab === 'diligence') loadDiligence(selectedSessionId)
    if (activeTab === 'leaderboard') loadLeaderboard(selectedSessionId)
  }, [selectedSessionId, activeTab, loadParticipants, loadMaterials, loadMandates, loadFairValue, loadDiligence, loadLeaderboard])

  async function handleReassign(participantId: string, roleKey: string) {
    if (!selectedSessionId) return
    const targetFull = (participantCounts[roleKey] ?? 0) >= 4
    if (targetFull) {
      const confirmed = window.confirm(`${ROLE_LABELS[roleKey]} is already at 4/4. Assign anyway?`)
      if (!confirmed) return
    }
    try {
      const data = await jsonFetch<{ participant: Participant; warning: boolean }>(
        `/api/admin/hackathon/sessions/${selectedSessionId}/participants/${participantId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_key: roleKey }),
        }
      )
      setParticipants((prev) => prev.map((p) => (p.id === participantId ? data.participant : p)))
      loadParticipants(selectedSessionId)
    } catch (err) {
      setParticipantsError(err instanceof Error ? err.message : 'Errore imprevisto')
    }
  }

  async function handleUploadMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSessionId || !uploadFile || !uploadTitle.trim()) return
    setUploading(true)
    setMaterialsError(null)
    try {
      const formData = new FormData()
      formData.set('file', uploadFile)
      formData.set('title', uploadTitle.trim())
      formData.set('phase_number', uploadPhase)
      formData.set('role_key', uploadRole)

      await jsonFetch(`/api/admin/hackathon/sessions/${selectedSessionId}/materials`, {
        method: 'POST',
        body: formData,
      })
      setUploadTitle('')
      setUploadFile(null)
      loadMaterials(selectedSessionId)
    } catch (err) {
      setMaterialsError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    if (!selectedSessionId) return
    try {
      await jsonFetch(`/api/admin/hackathon/sessions/${selectedSessionId}/materials/${materialId}`, { method: 'DELETE' })
      setMaterials((prev) => prev.filter((m) => m.id !== materialId))
    } catch (err) {
      setMaterialsError(err instanceof Error ? err.message : 'Errore imprevisto')
    }
  }

  function handleMandateChange(roleKey: string, content: string) {
    setMandates((prev) => prev.map((m) => (m.role_key === roleKey ? { ...m, content } : m)))
  }

  async function handleSaveMandates() {
    if (!selectedSessionId) return
    setSavingMandates(true)
    setMandatesError(null)
    try {
      const data = await jsonFetch<{ mandates: Mandate[] }>(`/api/admin/hackathon/sessions/${selectedSessionId}/mandates`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mandates: mandates.map((m) => ({ role_key: m.role_key, content: m.content })) }),
      })
      setMandates(data.mandates)
    } catch (err) {
      setMandatesError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSavingMandates(false)
    }
  }

  async function handleSaveFairValue() {
    if (!selectedSessionId) return
    setSavingFairValue(true)
    setFairValueError(null)
    try {
      const data = await jsonFetch<{ fair_value: FairValue }>(`/api/admin/hackathon/sessions/${selectedSessionId}/fair-value`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fairValue),
      })
      setFairValue(data.fair_value)
    } catch (err) {
      setFairValueError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSavingFairValue(false)
    }
  }

  const TABS: { id: TabType; label: string }[] = [
    { id: 'participants', label: 'Participants' },
    { id: 'materials', label: 'Materials' },
    { id: 'mandates', label: 'Mandates' },
    { id: 'fair_value', label: 'Fair Value' },
    { id: 'diligence', label: 'Diligence Overview' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <h1 className="font-serif text-2xl text-ink-900">M&amp;A Hackathon</h1>

      <Collapsible title="Sessions" open={sessionsOpen} onToggle={() => setSessionsOpen((v) => !v)}>
        {loadingSessions ? (
          <p className="text-sm text-ink-500">Loading…</p>
        ) : (
          <>
            {sessionsError && <p className="text-sm text-red-700 mb-3">{sessionsError}</p>}
            <div className="space-y-2 mb-6">
              {sessions.length === 0 ? (
                <p className="text-sm text-ink-500">No sessions yet.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between border px-4 py-3 cursor-pointer ${
                      selectedSessionId === s.id ? 'border-forest' : 'border-line-faint'
                    }`}
                    onClick={() => setSelectedSessionId(s.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900">{s.case_name}</p>
                      <p className="text-xs text-ink-500">
                        Status: {s.status} · Phase {s.current_phase}/{MAX_PHASE} · Code {s.access_code}
                      </p>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {(['draft', 'active', 'closed'] as const).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusChange(s.id, status)}
                          className={`text-xs px-3 py-1.5 border transition-colors ${
                            s.status === status
                              ? 'bg-forest text-white border-forest'
                              : 'border-line-faint text-ink-500 hover:text-ink-900'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleCreateSession} className="border-t border-line-faint pt-4 space-y-3">
              <p className="text-xs tracking-[0.2em] uppercase text-ink-500">New session</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="Case name"
                  className="border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                />
                <input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Access code"
                  className="border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                />
                <input
                  value={judgeCode}
                  onChange={(e) => setJudgeCode(e.target.value)}
                  placeholder="Judge code"
                  className="border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                />
              </div>
              {createError && <p className="text-sm text-red-700">{createError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="bg-forest text-white text-sm px-5 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create Session'}
              </button>
            </form>
          </>
        )}
      </Collapsible>

      {selectedSession && (
        <Collapsible title={`Session: ${selectedSession.case_name}`} open={detailOpen} onToggle={() => setDetailOpen((v) => !v)}>
          <div className="flex items-center gap-4 mb-6">
            <button
              type="button"
              onClick={() => handlePhaseChange(-1)}
              disabled={phaseSaving || selectedSession.current_phase <= 0}
              className="border border-line-faint px-3 py-1.5 text-sm text-ink-700 hover:text-ink-900 disabled:opacity-30"
            >
              ← Prev
            </button>
            <p className="font-serif text-lg text-forest">
              Phase {selectedSession.current_phase}/{MAX_PHASE}
            </p>
            <button
              type="button"
              onClick={() => handlePhaseChange(1)}
              disabled={phaseSaving || selectedSession.current_phase >= MAX_PHASE}
              className="border border-line-faint px-3 py-1.5 text-sm text-ink-700 hover:text-ink-900 disabled:opacity-30"
            >
              Next →
            </button>
          </div>

          <div className="flex gap-1 border-b border-line-faint mb-6 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-forest text-forest' : 'border-transparent text-ink-500 hover:text-ink-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'participants' && (
            <div>
              <div className="flex gap-4 mb-4">
                {ROLES.map((role) => (
                  <span key={role} className="text-xs text-ink-500">
                    {ROLE_LABELS[role]}: {participantCounts[role] ?? 0}/4
                  </span>
                ))}
              </div>
              {participantsError && <p className="text-sm text-red-700 mb-3">{participantsError}</p>}
              {participantsLoading ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : participants.length === 0 ? (
                <p className="text-sm text-ink-500">No participants yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-ink-500 border-b border-line-faint">
                      <th className="py-2">Name</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Joined</th>
                      <th className="py-2">Reassign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p) => (
                      <tr key={p.id} className="border-b border-line-faint">
                        <td className="py-2 text-ink-900">{p.name}</td>
                        <td className="py-2 text-ink-700">{ROLE_LABELS[p.role_key] ?? p.role_key}</td>
                        <td className="py-2 text-ink-500">{new Date(p.joined_at).toLocaleString()}</td>
                        <td className="py-2">
                          <select
                            value={p.role_key}
                            onChange={(e) => handleReassign(p.id, e.target.value)}
                            className="border border-line px-2 py-1 text-xs text-ink-900 focus:outline-none focus:border-forest"
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div>
              <form onSubmit={handleUploadMaterial} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
                <input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Title"
                  className="border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                />
                <input
                  type="number"
                  min={1}
                  max={MAX_PHASE}
                  value={uploadPhase}
                  onChange={(e) => setUploadPhase(e.target.value)}
                  placeholder="Phase"
                  className="border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                />
                <select
                  value={uploadRole}
                  onChange={(e) => setUploadRole(e.target.value)}
                  className="border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <FileUploadButton value={uploadFile} onChange={setUploadFile} className="md:col-span-1" />
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-forest text-white text-sm px-4 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </form>

              {materialsError && <p className="text-sm text-red-700 mb-3">{materialsError}</p>}
              {materialsLoading ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : materials.length === 0 ? (
                <p className="text-sm text-ink-500">No materials yet.</p>
              ) : (
                <div className="space-y-2">
                  {materials.map((m) => (
                    <div key={m.id} className="flex items-center justify-between border border-line-faint px-4 py-2">
                      <div>
                        <p className="text-sm text-ink-900">{m.title}</p>
                        <p className="text-xs text-ink-500">
                          Phase {m.phase_number} · {ROLE_LABELS[m.role_key] ?? m.role_key}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMaterial(m.id)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'mandates' && (
            <div className="space-y-4">
              {mandatesError && <p className="text-sm text-red-700">{mandatesError}</p>}
              {mandatesLoading ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : (
                <>
                  {mandates.map((m) => (
                    <div key={m.role_key}>
                      <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-2">
                        {ROLE_LABELS[m.role_key] ?? m.role_key}
                      </p>
                      <textarea
                        value={m.content}
                        onChange={(e) => handleMandateChange(m.role_key, e.target.value)}
                        rows={4}
                        className="w-full border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleSaveMandates}
                    disabled={savingMandates}
                    className="bg-forest text-white text-sm px-5 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50"
                  >
                    {savingMandates ? 'Saving…' : 'Save Mandates'}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'fair_value' && (
            <div className="space-y-4">
              {fairValueError && <p className="text-sm text-red-700">{fairValueError}</p>}
              {fairValueLoading ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : (
                <>
                  <div>
                    <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-2">Content</p>
                    <textarea
                      value={fairValue.content}
                      onChange={(e) => setFairValue((prev) => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="w-full border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-2">Valuation range</p>
                    <input
                      value={fairValue.valuation_range}
                      onChange={(e) => setFairValue((prev) => ({ ...prev, valuation_range: e.target.value }))}
                      className="w-full border border-line px-3 py-2 text-sm text-ink-900 focus:outline-none focus:border-forest"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveFairValue}
                    disabled={savingFairValue}
                    className="bg-forest text-white text-sm px-5 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50"
                  >
                    {savingFairValue ? 'Saving…' : 'Save Fair Value'}
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'diligence' && (
            <div className="space-y-6">
              {diligenceError && <p className="text-sm text-red-700">{diligenceError}</p>}
              {diligenceLoading ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : diligenceRooms.length === 0 ? (
                <p className="text-sm text-ink-500">No diligence rooms yet.</p>
              ) : (
                diligenceRooms.map((room) => (
                  <div
                    key={room.id}
                    className="border border-line-faint px-4 py-4"
                    style={{ borderLeft: `3px solid ${getRoleColor(room.buy_side_role)}` }}
                  >
                    <p
                      className="text-xs tracking-[0.2em] uppercase mb-3"
                      style={{ color: getRoleColor(room.buy_side_role) }}
                    >
                      {ROLE_LABELS[room.buy_side_role] ?? room.buy_side_role}
                    </p>
                    {room.messages.length === 0 ? (
                      <p className="text-sm text-ink-500">No messages yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {room.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className="border-b border-line-faint pb-2 pl-3"
                            style={{ borderLeft: `2px solid ${getRoleColor(msg.sender_role)}` }}
                          >
                            <p className="text-xs" style={{ color: getRoleColor(msg.sender_role) }}>
                              {ROLE_LABELS[msg.sender_role] ?? msg.sender_role} · {new Date(msg.created_at).toLocaleString()}
                            </p>
                            {msg.message && <p className="text-sm text-ink-900">{msg.message}</p>}
                            {msg.attachment_url && (
                              <a
                                href={msg.attachment_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-forest underline-grow"
                              >
                                Attachment
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              {leaderboardError && <p className="text-sm text-red-700">{leaderboardError}</p>}
              {leaderboardLoading || !leaderboard ? (
                <p className="text-sm text-ink-500">Loading…</p>
              ) : (
                <>
                  <div className="border border-line-faint px-4 py-4">
                    <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-3">Buy-Side Ranking</p>
                    <ol className="space-y-2">
                      {leaderboard.buy_side.map((entry, i) => (
                        <li key={entry.role_key} className="flex items-center justify-between text-sm">
                          <span className="text-ink-900">
                            {i + 1}. {ROLE_LABELS[entry.role_key] ?? entry.role_key}
                          </span>
                          <span className="text-forest font-medium">
                            {entry.weighted_score !== null ? entry.weighted_score.toFixed(1) : '—'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="border border-line-faint px-4 py-4">
                    <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-3">Sell-Side Score</p>
                    <p className="text-forest font-medium text-lg">
                      {leaderboard.sell_side.weighted_score !== null ? leaderboard.sell_side.weighted_score.toFixed(1) : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </Collapsible>
      )}
    </div>
  )
}
