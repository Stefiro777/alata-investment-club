'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type Idea = {
  id: string
  title: string
  description: string | null
  category: string | null
  author_id: string | null
  author_name: string
  upvoted_by: string[]
  created_at: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── CreateIdeaModal ───────────────────────────────────────────────────────────

function CreateIdeaModal({
  userId,
  authorName,
  onClose,
  onCreated,
}: {
  userId: string
  authorName: string
  onClose: () => void
  onCreated: (idea: Idea) => void
}) {
  const [title, setTitle]       = useState('')
  const [description, setDesc]  = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data, error: err } = await supabase
      .from('ideas')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        author_id: userId,
      })
      .select('id, title, description, category, author_id, upvoted_by, created_at')
      .single()

    if (err || !data) {
      setError(err?.message ?? 'Errore durante l\'inserimento')
      setSaving(false)
      return
    }

    const r = data as Record<string, unknown>
    onCreated({
      id: r.id as string,
      title: r.title as string,
      description: r.description as string | null,
      category: r.category as string | null,
      author_id: userId,
      author_name: authorName,
      upvoted_by: (r.upvoted_by as string[]) ?? [],
      created_at: r.created_at as string,
    })
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-7 py-5 border-b border-line flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-ink-900">Nuova idea</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Titolo *</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nome dell'idea o progetto"
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Descrizione</label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Descrivi l'idea, il contesto, come potrebbe funzionare…"
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wide text-ink-400 mb-1">Categoria (opzionale)</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="es. Evento, Ricerca, Tecnologia…"
              className="w-full border border-line px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-forest"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex items-center gap-4 pt-1">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-6 py-2.5 transition-colors disabled:opacity-40"
            >
              {saving ? 'Pubblicazione…' : 'Pubblica idea'}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-ink-500 hover:text-ink-900">
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── IdeaCard ──────────────────────────────────────────────────────────────────

function IdeaCard({
  idea,
  userId,
  isBoD,
  onUpvote,
  onDelete,
}: {
  idea: Idea
  userId: string
  isBoD: boolean
  onUpvote: (id: string, upvoted_by: string[]) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded]   = useState(false)
  const [voting, setVoting]       = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]   = useState(false)

  const hasVoted   = idea.upvoted_by.includes(userId)
  const isAuthor   = idea.author_id === userId
  const canDelete  = isBoD || isAuthor

  const descPreview =
    idea.description && idea.description.length > 150
      ? idea.description.slice(0, 150) + '…'
      : idea.description

  async function handleUpvote() {
    if (voting) return
    setVoting(true)
    const next = hasVoted
      ? idea.upvoted_by.filter(u => u !== userId)
      : [...idea.upvoted_by, userId]

    const supabase = createClient()
    const { error } = await supabase
      .from('ideas')
      .update({ upvoted_by: next })
      .eq('id', idea.id)

    if (!error) onUpvote(idea.id, next)
    setVoting(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    const { error } = await supabase.from('ideas').delete().eq('id', idea.id)
    if (!error) onDelete(idea.id)
    else setDeleting(false)
  }

  return (
    <div className="border border-line bg-white flex flex-col">
      {/* Body */}
      <div className="px-5 py-5 flex-1 flex flex-col gap-3">
        {/* Title + category */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-lg font-semibold text-ink-900 leading-snug flex-1">
            {idea.title}
          </h3>
          {idea.category && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 bg-forest/10 text-forest flex-shrink-0">
              {idea.category}
            </span>
          )}
        </div>

        {/* Description */}
        {idea.description && (
          <div>
            <p className="text-sm text-ink-600 leading-relaxed">
              {expanded ? idea.description : descPreview}
            </p>
            {idea.description.length > 150 && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="text-xs text-forest hover:underline mt-1"
              >
                {expanded ? 'Mostra meno' : 'Leggi tutto'}
              </button>
            )}
          </div>
        )}

        {/* Author + date */}
        <div className="flex items-center gap-2 text-[11px] text-ink-400 mt-auto pt-1">
          <span className="font-medium text-ink-500">{idea.author_name}</span>
          <span>·</span>
          <span>{fmtDate(idea.created_at)}</span>
        </div>
      </div>

      {/* Footer: upvote + delete */}
      <div className="border-t border-line px-5 py-3 flex items-center justify-between gap-3">
        {/* Upvote */}
        <button
          type="button"
          onClick={handleUpvote}
          disabled={voting}
          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 border transition-colors disabled:opacity-50 ${
            hasVoted
              ? 'bg-forest border-forest text-white'
              : 'bg-white border-line text-ink-500 hover:border-forest hover:text-forest'
          }`}
        >
          <span>👍</span>
          <span>{idea.upvoted_by.length}</span>
        </button>

        {/* Delete */}
        {canDelete && (
          <div className="flex items-center gap-2">
            {confirmDel ? (
              <>
                <span className="text-xs text-ink-500">Eliminare?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40"
                >
                  {deleting ? '…' : 'Sì'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="text-xs text-ink-400 hover:text-ink-700"
                >
                  No
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                title="Elimina"
                className="p-1.5 text-ink-300 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IdeasPage() {
  const profile = useProfile()

  const [ideas, setIdeas]       = useState<Idea[]>([])
  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const isBoD = profile?.role === 'bod' || profile?.role === 'director'

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data: rows } = await supabase
        .from('ideas')
        .select('id, title, description, category, author_id, upvoted_by, created_at')
        .order('created_at', { ascending: false })

      const rawRows = rows ?? []

      // Resolve author names
      const authorIds = [...new Set(
        rawRows.map((r: Record<string, unknown>) => r.author_id).filter(Boolean)
      )] as string[]

      let nameMap: Record<string, string> = {}
      if (authorIds.length) {
        const { data: members } = await supabase
          .from('club_members')
          .select('user_id, full_name')
          .in('user_id', authorIds)
        ;(members ?? []).forEach((m: Record<string, unknown>) => {
          if (m.user_id) nameMap[m.user_id as string] = m.full_name as string
        })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed: Idea[] = rawRows.map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description ?? null,
        category: r.category ?? null,
        author_id: r.author_id ?? null,
        author_name: r.author_id ? (nameMap[r.author_id] ?? 'Membro') : 'Membro',
        upvoted_by: r.upvoted_by ?? [],
        created_at: r.created_at,
      }))

      // Sort: upvotes DESC, then date DESC
      parsed.sort((a, b) =>
        b.upvoted_by.length - a.upvoted_by.length ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setIdeas(parsed)
      setLoading(false)
    }

    load()
  }, [])

  function handleUpvote(id: string, upvoted_by: string[]) {
    setIdeas(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, upvoted_by } : i)
      return [...updated].sort((a, b) =>
        b.upvoted_by.length - a.upvoted_by.length ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
  }

  function handleCreated(idea: Idea) {
    setIdeas(prev => {
      const updated = [idea, ...prev]
      return updated.sort((a, b) =>
        b.upvoted_by.length - a.upvoted_by.length ||
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    })
    setShowCreate(false)
  }

  function handleDeleted(id: string) {
    setIdeas(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-8 py-16 text-sm text-ink-500">Caricamento...</div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-ink-900 mb-3">Idee &amp; Progetti</h1>
          <div className="w-8 h-px bg-forest" />
        </div>
        {userId && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuova idea
          </button>
        )}
      </div>

      {/* Grid */}
      {ideas.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-serif text-2xl text-ink-900 mb-2">Nessuna idea ancora</p>
          <p className="text-sm text-ink-500">Sii il primo a proporre qualcosa!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {ideas.map(idea => (
            userId && (
              <IdeaCard
                key={idea.id}
                idea={idea}
                userId={userId}
                isBoD={isBoD}
                onUpvote={handleUpvote}
                onDelete={handleDeleted}
              />
            )
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && userId && (
        <CreateIdeaModal
          userId={userId}
          authorName={profile?.full_name ?? 'Tu'}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

    </div>
  )
}
