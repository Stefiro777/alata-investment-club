'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getRubricForRole } from '@/lib/hackathon-rubric'
import { getRoleColor } from '@/lib/hackathon-colors'
import { appendDiligenceMessage, useDiligenceRealtime } from '@/lib/hackathon-realtime'

const STORAGE_KEY = 'alata_hackathon_judge_session'
const LEADERBOARD_POLL_MS = 15000
const DILIGENCE_POLL_MS = 30000

const ROLES = ['sell_side', 'buy_side_1', 'buy_side_2', 'buy_side_3'] as const
const ROLE_LABELS: Record<string, string> = {
  sell_side: 'Sell-Side Advisor',
  buy_side_1: 'Buy-Side Bidder 1',
  buy_side_2: 'Buy-Side Bidder 2',
  buy_side_3: 'Buy-Side Bidder 3',
}

const CRITERION_LABELS: Record<string, string> = {
  valuation_mechanics: 'Valuation Mechanics',
  discipline: 'Discipline',
  commercial_judgment: 'Commercial Judgment',
  deal_structuring: 'Deal Structuring',
  qa_quality: 'Q&A Quality',
  price_vs_fair_value: 'Price vs Fair Value',
  mandate_compliance: 'Mandate Compliance',
  diligence_management: 'Diligence Management',
  presentation: 'Presentation',
}

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
type Submission = {
  id: string
  phase_number: number
  role_key: string
  file_path: string | null
  file_url: string | null
  deal_structure: Record<string, unknown> | null
  submitted_by: string
  submitted_at: string
}
type Overview = {
  mandates: Mandate[]
  fair_value: FairValue
  rooms: DiligenceRoom[]
  submissions: Submission[]
}
type LeaderboardEntry = { role_key: string; weighted_score: number | null }
type Leaderboard = { buy_side: LeaderboardEntry[]; sell_side: { weighted_score: number | null } }

type TabType = 'overview' | 'diligence' | 'submissions' | 'score' | 'leaderboard'

type JudgeSession = { session_id: string; judge_code: string; case_name: string }

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Errore imprevisto')
  return data as T
}

export default function JudgeClient() {
  const [judgeSession, setJudgeSession] = useState<JudgeSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [judgeCodeInput, setJudgeCodeInput] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)

  const [scoreRole, setScoreRole] = useState<string>(ROLES[0])
  const [judgeName, setJudgeName] = useState('')
  const [scoreValues, setScoreValues] = useState<Record<string, number>>({})
  const [savingScore, setSavingScore] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [scoreSaved, setScoreSaved] = useState(false)

  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setJudgeSession(JSON.parse(saved))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setRestoring(false)
  }, [])

  const loadOverview = useCallback(async (session: JudgeSession) => {
    setOverviewLoading(true)
    setOverviewError(null)
    try {
      const data = await jsonFetch<Overview>(
        `/api/hackathon/judge/${session.session_id}/overview?judge_code=${encodeURIComponent(session.judge_code)}`
      )
      setOverview(data)
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const loadLeaderboard = useCallback(async (session: JudgeSession) => {
    try {
      const data = await jsonFetch<Leaderboard>(`/api/hackathon/judge/${session.session_id}/leaderboard`)
      setLeaderboard(data)
    } catch {
      // silent retry on next poll
    }
  }, [])

  useEffect(() => {
    if (!judgeSession) return
    loadOverview(judgeSession)
  }, [judgeSession, loadOverview])

  useEffect(() => {
    if (!judgeSession || activeTab !== 'leaderboard') return
    loadLeaderboard(judgeSession)
    const interval = setInterval(() => loadLeaderboard(judgeSession), LEADERBOARD_POLL_MS)
    return () => clearInterval(interval)
  }, [judgeSession, activeTab, loadLeaderboard])

  // Realtime keeps diligence messages current; this is just the disconnect fallback.
  useEffect(() => {
    if (!judgeSession || activeTab !== 'diligence') return
    const interval = setInterval(() => loadOverview(judgeSession), DILIGENCE_POLL_MS)
    return () => clearInterval(interval)
  }, [judgeSession, activeTab, loadOverview])

  const roomIds = useMemo(() => overview?.rooms.map((r) => r.id) ?? [], [overview])

  useDiligenceRealtime(
    roomIds,
    useCallback((roomId: string, message: DiligenceMessage) => {
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              rooms: prev.rooms.map((room) =>
                room.id === roomId ? { ...room, messages: appendDiligenceMessage(room.messages, message) } : room
              ),
            }
          : prev
      )
    }, [])
  )

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    if (!judgeCodeInput.trim()) return
    setLoginLoading(true)
    try {
      const data = await jsonFetch<{ session_id: string; case_name: string }>('/api/hackathon/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judge_code: judgeCodeInput.trim() }),
      })
      const session: JudgeSession = { session_id: data.session_id, judge_code: judgeCodeInput.trim(), case_name: data.case_name }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      setJudgeSession(session)
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setLoginLoading(false)
    }
  }

  function handleScoreRoleChange(roleKey: string) {
    setScoreRole(roleKey)
    setScoreValues({})
    setScoreSaved(false)
  }

  async function handleSubmitScore(e: React.FormEvent) {
    e.preventDefault()
    if (!judgeSession) return
    setScoreError(null)
    setScoreSaved(false)
    if (!judgeName.trim()) {
      setScoreError('Missing judge name')
      return
    }
    const rubric = getRubricForRole(scoreRole)
    if (!rubric) return

    const scores = Object.keys(rubric).map((criterion) => ({
      criterion,
      score: scoreValues[criterion] ?? 0,
    }))

    setSavingScore(true)
    try {
      await jsonFetch(`/api/hackathon/judge/${judgeSession.session_id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judge_code: judgeSession.judge_code,
          judge_name: judgeName.trim(),
          role_key: scoreRole,
          scores,
        }),
      })
      setScoreSaved(true)
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSavingScore(false)
    }
  }

  if (restoring) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper">
        <p className="font-sans text-ink-500">Loading…</p>
      </main>
    )
  }

  if (!judgeSession) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-paper px-6">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-3xl text-forest mb-8 text-center">Judge Access</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <label className="block font-sans text-sm text-ink-700">
              Judge code
              <input
                autoFocus
                value={judgeCodeInput}
                onChange={(e) => setJudgeCodeInput(e.target.value)}
                className="mt-2 w-full border border-line px-4 py-3 font-sans text-ink-900 focus:outline-none focus:border-forest"
                placeholder="Enter judge code"
              />
            </label>
            {loginError && <p className="text-sm text-red-700 font-sans">{loginError}</p>}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-forest text-white font-sans py-3 hover:bg-forest-deep transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Entering…' : 'Enter'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  const TABS: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'diligence', label: 'Diligence' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'score', label: 'Score' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ]

  const scoreRubric = getRubricForRole(scoreRole)

  return (
    <main className="min-h-screen bg-paper px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center space-y-2">
          <span className="inline-block bg-forest text-white font-sans text-xs tracking-widest uppercase px-4 py-2">
            Judge
          </span>
          <h1 className="font-serif text-3xl text-ink-900">{judgeSession.case_name}</h1>
        </header>

        <div className="flex gap-1 border-b border-line overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs uppercase tracking-wide whitespace-nowrap border-b-2 transition-colors font-sans ${
                activeTab === tab.id ? 'border-forest text-forest' : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {overviewError && <p className="text-sm text-red-700 font-sans">{overviewError}</p>}

        {activeTab === 'overview' && (
          <section className="space-y-4">
            {overviewLoading || !overview ? (
              <p className="font-sans text-sm text-ink-500">Loading…</p>
            ) : (
              <>
                <div className="border border-line px-6 py-6">
                  <h2 className="font-serif text-xl text-forest mb-4">Fair Value</h2>
                  <p className="font-sans text-ink-700 whitespace-pre-wrap leading-relaxed">
                    {overview.fair_value.content || 'Not available.'}
                  </p>
                  {overview.fair_value.valuation_range && (
                    <p className="font-sans text-sm text-ink-500 mt-2">Range: {overview.fair_value.valuation_range}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ROLES.map((role) => {
                    const mandate = overview.mandates.find((m) => m.role_key === role)
                    return (
                      <div key={role} className="border border-line px-6 py-6">
                        <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-2">{ROLE_LABELS[role]}</p>
                        <p className="font-sans text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">
                          {mandate?.content || 'No mandate yet.'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'diligence' && (
          <section className="space-y-6">
            {overviewLoading || !overview ? (
              <p className="font-sans text-sm text-ink-500">Loading…</p>
            ) : overview.rooms.length === 0 ? (
              <p className="font-sans text-sm text-ink-500">No diligence rooms yet.</p>
            ) : (
              overview.rooms.map((room) => (
                <div
                  key={room.id}
                  className="border border-line px-6 py-6"
                  style={{ borderLeft: `3px solid ${getRoleColor(room.buy_side_role)}` }}
                >
                  <p
                    className="text-xs tracking-[0.2em] uppercase mb-3"
                    style={{ color: getRoleColor(room.buy_side_role) }}
                  >
                    {ROLE_LABELS[room.buy_side_role] ?? room.buy_side_role}
                  </p>
                  {room.messages.length === 0 ? (
                    <p className="font-sans text-sm text-ink-500">No messages yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {room.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="border-b border-line-faint pb-2 pl-3"
                          style={{ borderLeft: `2px solid ${getRoleColor(msg.sender_role)}` }}
                        >
                          <p className="font-sans text-xs" style={{ color: getRoleColor(msg.sender_role) }}>
                            {ROLE_LABELS[msg.sender_role] ?? msg.sender_role} · {new Date(msg.created_at).toLocaleString()}
                          </p>
                          {msg.message && <p className="font-sans text-sm text-ink-900">{msg.message}</p>}
                          {msg.attachment_url && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-sans text-xs text-forest underline-grow"
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
          </section>
        )}

        {activeTab === 'submissions' && (
          <section className="space-y-4">
            {overviewLoading || !overview ? (
              <p className="font-sans text-sm text-ink-500">Loading…</p>
            ) : overview.submissions.length === 0 ? (
              <p className="font-sans text-sm text-ink-500">No submissions yet.</p>
            ) : (
              overview.submissions.map((s) => (
                <div key={s.id} className="border border-line px-6 py-4">
                  <p className="text-xs tracking-[0.2em] uppercase text-ink-500">
                    Phase {s.phase_number} · {ROLE_LABELS[s.role_key] ?? s.role_key}
                  </p>
                  <p className="font-sans text-sm text-ink-500 mt-1">
                    Submitted by {s.submitted_by} on {new Date(s.submitted_at).toLocaleString()}
                  </p>
                  {s.file_url && (
                    <a
                      href={s.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-sans text-sm text-forest underline-grow block mt-1"
                    >
                      Download file
                    </a>
                  )}
                  {s.deal_structure && (
                    <div className="mt-2 border-t border-line-faint pt-2">
                      <p className="font-sans text-xs text-ink-500 mb-1">Deal structure</p>
                      <dl className="text-sm font-sans text-ink-900 space-y-0.5">
                        {Object.entries(s.deal_structure).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <dt className="text-ink-500">{key}:</dt>
                            <dd>{String(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {activeTab === 'score' && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleScoreRoleChange(role)}
                  className={`text-xs px-3 py-1.5 border font-sans transition-colors ${
                    scoreRole === role ? 'bg-forest text-white border-forest' : 'border-line-faint text-ink-500 hover:text-ink-900'
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmitScore} className="border border-line px-6 py-6 space-y-4">
              <label className="block font-sans text-sm text-ink-700">
                Judge name
                <input
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  className="mt-2 w-full border border-line px-3 py-2 font-sans text-sm text-ink-900 focus:outline-none focus:border-forest"
                  placeholder="Your name"
                />
              </label>

              {scoreRubric &&
                Object.entries(scoreRubric).map(([criterion, weight]) => (
                  <div key={criterion}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-sans text-sm text-ink-700">
                        {CRITERION_LABELS[criterion] ?? criterion} ({Math.round(weight * 100)}%)
                      </label>
                      <span className="font-sans text-sm text-ink-900">{scoreValues[criterion] ?? 0}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={scoreValues[criterion] ?? 0}
                      onChange={(e) =>
                        setScoreValues((prev) => ({ ...prev, [criterion]: Number(e.target.value) }))
                      }
                      className="w-full"
                    />
                  </div>
                ))}

              {scoreError && <p className="text-sm text-red-700 font-sans">{scoreError}</p>}
              {scoreSaved && <p className="text-sm text-forest font-sans">Score saved.</p>}

              <button
                type="submit"
                disabled={savingScore}
                className="bg-forest text-white font-sans text-sm px-5 py-2 hover:bg-forest-deep transition-colors disabled:opacity-50"
              >
                {savingScore ? 'Saving…' : 'Save Score'}
              </button>
            </form>
          </section>
        )}

        {activeTab === 'leaderboard' && (
          <section className="space-y-4">
            {!leaderboard ? (
              <p className="font-sans text-sm text-ink-500">Loading…</p>
            ) : (
              <>
                <div className="border border-line px-6 py-6">
                  <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-3">Buy-Side Ranking</p>
                  <ol className="space-y-2">
                    {leaderboard.buy_side.map((entry, i) => (
                      <li key={entry.role_key} className="flex items-center justify-between font-sans text-sm">
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
                <div className="border border-line px-6 py-6">
                  <p className="text-xs tracking-[0.2em] uppercase text-ink-500 mb-3">Sell-Side Score</p>
                  <p className="font-sans text-forest font-medium text-lg">
                    {leaderboard.sell_side.weighted_score !== null ? leaderboard.sell_side.weighted_score.toFixed(1) : '—'}
                  </p>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
