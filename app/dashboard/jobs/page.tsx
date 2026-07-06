'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'

// ── Types ─────────────────────────────────────────────────────────────────────

type JobOffer = {
  id: string
  title: string
  company: string
  link: string
  description: string | null
  type: 'official' | 'member'
  created_by: string | null
  created_at: string
  creator_name?: string | null
  apply_mode?: 'link' | 'form'
}

type ModalState = {
  mode: 'add-official' | 'add-member' | 'edit'
  offer?: JobOffer
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// ── JobModal ──────────────────────────────────────────────────────────────────

function JobModal({
  mode,
  offer,
  userId,
  onClose,
  onSaved,
}: {
  mode: 'add-official' | 'add-member' | 'edit'
  offer?: JobOffer
  userId: string
  onClose: () => void
  onSaved: (job: JobOffer, isNew: boolean) => void
}) {
  const [title, setTitle]         = useState(offer?.title ?? '')
  const [company, setCompany]     = useState(offer?.company ?? '')
  const [link, setLink]           = useState(offer?.link ?? '')
  const [description, setDesc]    = useState(offer?.description ?? '')
  const [applyMode, setApplyMode] = useState<'link' | 'form'>(offer?.apply_mode ?? 'link')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const isEdit = mode === 'edit'
  const isOfficial = isEdit ? offer?.type === 'official' : mode === 'add-official'
  const jobType: 'official' | 'member' = isEdit ? (offer?.type ?? 'official') : mode === 'add-official' ? 'official' : 'member'
  const modalTitle = isEdit ? 'Modifica offerta' : mode === 'add-official' ? 'Aggiungi offerta ufficiale' : 'Segnala offerta'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !company.trim() || saving) return
    if (applyMode === 'link' && !link.trim()) return
    setSaving(true); setError(null)

    const supabase = createClient()

    if (isEdit && offer) {
      const { error: err } = await supabase
        .from('job_offers')
        .update({
          title: title.trim(),
          company: company.trim(),
          link: link.trim(),
          description: description || null,
          apply_mode: applyMode,
        })
        .eq('id', offer.id)
      if (err) { setError(err.message); setSaving(false); return }
      onSaved({ ...offer, title: title.trim(), company: company.trim(), link: link.trim(), description: description || null, apply_mode: applyMode }, false)
    } else {
      const { data, error: err } = await supabase
        .from('job_offers')
        .insert({
          title: title.trim(),
          company: company.trim(),
          link: link.trim(),
          description: description.trim() || null,
          type: jobType,
          created_by: userId,
          apply_mode: applyMode,
        })
        .select('id, title, company, link, description, type, created_by, created_at, apply_mode')
        .single()
      if (err || !data) { setError(err?.message ?? 'Errore'); setSaving(false); return }
      const newJob = data as JobOffer
      onSaved(newJob, true)
      // Fire-and-forget notification
      fetch('/api/jobs/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: newJob.id }),
      }).catch(() => {})
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-serif text-xl font-bold text-gray-900">{modalTitle}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Titolo *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Es. Junior Analyst"
              className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-forest text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Azienda *</label>
            <input required value={company} onChange={e => setCompany(e.target.value)}
              placeholder="Es. Goldman Sachs"
              className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-forest text-sm" />
          </div>

          {/* Apply mode toggle — only for official offers */}
          {isOfficial && (
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Modalità candidatura</label>
              <div className="flex gap-0 border border-gray-200">
                <button
                  type="button"
                  onClick={() => setApplyMode('link')}
                  className={`flex-1 px-3 py-2.5 text-sm transition-colors ${applyMode === 'link' ? 'bg-forest text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Link esterno
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode('form')}
                  className={`flex-1 px-3 py-2.5 text-sm border-l border-gray-200 transition-colors ${applyMode === 'form' ? 'bg-forest text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Form interno
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Link{applyMode === 'link' ? ' *' : ''}
            </label>
            <input
              required={applyMode === 'link'}
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-forest text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Descrizione</label>
            <textarea rows={4} value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Dettagli aggiuntivi sull'offerta…"
              className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-forest text-sm resize-none" />
          </div>
          {error && <p className="text-red-600 text-sm border-l-2 border-red-400 pl-3">{error}</p>}
        </form>
        <div className="px-7 py-5 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose}
            className="border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:border-gray-400 transition-colors">
            Annulla
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving}
            className="bg-forest hover:bg-forest-deep text-white text-sm font-medium px-5 py-2 transition-colors disabled:opacity-50">
            {saving ? '…' : isEdit ? 'Salva' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── JobApplicationModal ───────────────────────────────────────────────────────

export function JobApplicationModal({
  job,
  onClose,
}: {
  job: JobOffer
  onClose: () => void
}) {
  const [firstName, setFirstName]     = useState('')
  const [lastName, setLastName]       = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [cvFile, setCvFile]           = useState<File | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const fileRef                       = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (success) {
      const t = setTimeout(onClose, 3000)
      return () => clearTimeout(t)
    }
  }, [success, onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cvFile || submitting) return
    setSubmitting(true)
    setError(null)

    const supabase = createClient()

    // Upload CV
    const path = `${job.id}/${Date.now()}_${cvFile.name}`
    const { error: uploadErr } = await supabase.storage
      .from('cv-uploads')
      .upload(path, cvFile, { upsert: false })

    if (uploadErr) {
      setError(`Errore upload CV: ${uploadErr.message}`)
      setSubmitting(false)
      return
    }

    // Public URL
    const { data: publicData } = supabase.storage
      .from('cv-uploads')
      .getPublicUrl(path)
    const cvUrl = publicData?.publicUrl

    // Insert application
    const { error: insertErr } = await supabase.from('job_applications').insert({
      job_offer_id: job.id,
      job_title: job.title,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      cover_letter: coverLetter.trim() || null,
      cv_url: cvUrl,
      cv_filename: cvFile.name,
    })

    if (insertErr) {
      setError(`Errore invio: ${insertErr.message}`)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
  }

  const inputCls = 'w-full border border-black px-3 py-2 text-sm focus:outline-none focus:border-forest rounded-none'
  const labelCls = 'block text-xs font-semibold uppercase tracking-widest text-black mb-1'

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto border-t-4 border-forest relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black text-xl leading-none hover:opacity-60 transition-opacity z-10"
          aria-label="Chiudi"
        >
          ✕
        </button>

        {success ? (
          <div className="px-8 py-16 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-full bg-forest flex items-center justify-center mb-5">
              <span className="text-white text-2xl font-bold">✓</span>
            </div>
            <p className="font-serif text-xl font-bold text-gray-900">Candidatura inviata con successo.</p>
            <p className="text-sm text-gray-500 mt-2">La finestra si chiuderà tra qualche secondo.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-8 pt-8 pb-4">
              <h2 className="font-serif text-2xl font-bold text-black">Candidatura</h2>
              <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">{job.company}</p>
              <p className="text-sm text-gray-700 mt-0.5">{job.title}</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nome *</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Cognome *</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email *</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Telefono</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>LinkedIn URL</label>
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={e => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Lettera di presentazione</label>
                <textarea
                  rows={5}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>

              <div>
                <label className={labelCls}>CV *</label>
                <div
                  className="w-full border border-black px-3 py-2 text-sm cursor-pointer hover:border-forest transition-colors flex items-center gap-2"
                  onClick={() => fileRef.current?.click()}
                >
                  <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className={cvFile ? 'text-gray-900' : 'text-gray-400'}>
                    {cvFile ? cvFile.name : 'Seleziona file (.pdf, .doc, .docx)'}
                  </span>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  required
                  className="hidden"
                  onChange={e => setCvFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm border-l-2 border-red-400 pl-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-forest text-white py-3 text-sm font-semibold uppercase tracking-widest hover:bg-black transition-colors rounded-none mt-6 disabled:opacity-50"
              >
                {submitting ? 'Invio in corso...' : 'Invia candidatura'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

// ── OfficialJobCard ───────────────────────────────────────────────────────────

function OfficialJobCard({
  offer,
  canManage,
  onEdit,
  onDelete,
}: {
  offer: JobOffer
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete]       = useState(false)
  const [deleting, setDeleting]                 = useState(false)
  const [collapsed, setCollapsed]               = useState(true)
  const [showAppModal, setShowAppModal]         = useState(false)

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('job_offers').delete().eq('id', offer.id)
    onDelete()
  }

  const isFormMode = offer.apply_mode === 'form'

  return (
    <>
      <div className="border border-gray-200 bg-white p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-lg font-bold text-gray-900 leading-tight">{offer.title}</h3>
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-forest text-white uppercase tracking-wide">
              {offer.company}
            </span>
          </div>
          {canManage && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-forest transition-colors">
                <PencilIcon />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-xs border border-red-300 text-red-600 px-2 py-1 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50">
                    Conferma
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="text-xs border border-gray-200 text-gray-600 px-2 py-1 hover:border-gray-400 transition-colors">
                    Annulla
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                  <TrashIcon />
                </button>
              )}
            </div>
          )}
        </div>
        {offer.description && (
          <div>
            <p className={`text-sm text-gray-600 leading-relaxed ${collapsed ? 'line-clamp-2' : 'whitespace-pre-wrap'}`}>
              {offer.description}
            </p>
            <button
              onClick={() => setCollapsed(c => !c)}
              className="mt-1 text-xs text-forest hover:underline underline-offset-2"
            >
              {collapsed ? 'Leggi di più ↓' : 'Chiudi ↑'}
            </button>
          </div>
        )}
        <div className="mt-auto pt-1">
          {isFormMode ? (
            <button
              onClick={() => setShowAppModal(true)}
              className="inline-block bg-forest text-white text-xs font-medium uppercase tracking-wide px-4 py-2 hover:bg-forest-deep transition-colors"
            >
              Candidati →
            </button>
          ) : (
            <a href={offer.link} target="_blank" rel="noopener noreferrer"
              className="inline-block bg-forest text-white text-xs font-medium uppercase tracking-wide px-4 py-2 hover:bg-forest-deep transition-colors">
              Candidati →
            </a>
          )}
        </div>
      </div>

      {showAppModal && (
        <JobApplicationModal job={offer} onClose={() => setShowAppModal(false)} />
      )}
    </>
  )
}

// ── MemberJobCard ─────────────────────────────────────────────────────────────

function MemberJobCard({
  offer,
  userId,
  isBoD,
  onDelete,
}: {
  offer: JobOffer
  userId: string | null
  isBoD: boolean
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const canDelete = isBoD || offer.created_by === userId

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('job_offers').delete().eq('id', offer.id)
    onDelete()
  }

  return (
    <div className="border border-gray-200 bg-white p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-bold text-gray-900 leading-tight">{offer.title}</h3>
          <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 bg-forest text-white uppercase tracking-wide">
            {offer.company}
          </span>
        </div>
        {canDelete && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={handleDelete} disabled={deleting}
                  className="text-xs border border-red-300 text-red-600 px-2 py-1 hover:bg-red-600 hover:text-white transition-colors disabled:opacity-50">
                  Conferma
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-xs border border-gray-200 text-gray-600 px-2 py-1 hover:border-gray-400 transition-colors">
                  Annulla
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>
      {offer.description && (
        <div>
          <p className={`text-sm text-gray-600 leading-relaxed ${collapsed ? 'line-clamp-2' : 'whitespace-pre-wrap'}`}>
            {offer.description}
          </p>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="mt-1 text-xs text-forest hover:underline underline-offset-2"
          >
            {collapsed ? 'Leggi di più ↓' : 'Chiudi ↑'}
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mt-auto pt-1 gap-4">
        <div className="text-xs text-gray-400">
          {offer.creator_name && <span>Segnalata da <span className="text-gray-600 font-medium">{offer.creator_name}</span> · </span>}
          {fmtDate(offer.created_at)}
        </div>
        <a href={offer.link} target="_blank" rel="noopener noreferrer"
          className="inline-block text-sm font-medium text-forest hover:underline underline-offset-2 flex-shrink-0">
          Vedi offerta →
        </a>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const profile = useProfile()
  const [userId, setUserId]             = useState<string | null>(null)
  const [officialOffers, setOfficial]   = useState<JobOffer[]>([])
  const [memberOffers, setMember]       = useState<JobOffer[]>([])
  const [subscribed, setSubscribed]     = useState(false)
  const [subId, setSubId]               = useState<string | null>(null)
  const [togglingSubscription, setToggling] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<ModalState | null>(null)

  const isBoD = profile?.role === 'bod' || profile?.role === 'director'

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: official }, { data: member }, { data: sub }] = await Promise.all([
      supabase.from('job_offers').select('id, title, company, link, description, type, created_by, created_at, apply_mode')
        .eq('type', 'official').order('created_at', { ascending: false }),
      supabase.from('job_offers').select('id, title, company, link, description, type, created_by, created_at, apply_mode')
        .eq('type', 'member').order('created_at', { ascending: false }),
      supabase.from('job_offer_subscriptions').select('id, subscribed').eq('user_id', user.id).maybeSingle(),
    ])

    // Resolve creator names for member offers
    const memberList = (member ?? []) as JobOffer[]
    const creatorIds = [...new Set(memberList.map(o => o.created_by).filter(Boolean))] as string[]
    let creatorMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('club_members').select('user_id, full_name').in('user_id', creatorIds)
      for (const c of (creators ?? [])) {
        if (c.user_id) creatorMap[c.user_id] = c.full_name ?? ''
      }
    }

    setOfficial((official ?? []) as JobOffer[])
    setMember(memberList.map(o => ({ ...o, creator_name: o.created_by ? (creatorMap[o.created_by] ?? null) : null })))
    if (sub) { setSubscribed((sub as { subscribed: boolean }).subscribed); setSubId((sub as { id: string }).id) }
    setLoading(false)
  }

  async function handleToggleSubscription() {
    if (togglingSubscription || !userId) return
    setToggling(true)
    const supabase = createClient()
    if (!subId) {
      const { data } = await supabase
        .from('job_offer_subscriptions')
        .insert({ user_id: userId, subscribed: true })
        .select('id, subscribed').single()
      if (data) { setSubId((data as { id: string }).id); setSubscribed(true) }
    } else {
      const newVal = !subscribed
      await supabase.from('job_offer_subscriptions').update({ subscribed: newVal }).eq('id', subId)
      setSubscribed(newVal)
    }
    setToggling(false)
  }

  function handleJobSaved(job: JobOffer, isNew: boolean) {
    if (isNew) {
      if (job.type === 'official') setOfficial(prev => [job, ...prev])
      else setMember(prev => [job, ...prev])
    } else {
      if (job.type === 'official') setOfficial(prev => prev.map(o => o.id === job.id ? job : o))
      else setMember(prev => prev.map(o => o.id === job.id ? job : o))
    }
    setModal(null)
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <p className="text-sm text-gray-400">Caricamento…</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-10">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Job Offers</h1>
          <div className="w-8 h-px bg-forest" />
        </div>
        {/* Subscription toggle */}
        <div className="flex items-center gap-3 flex-shrink-0 pt-1">
          <span className="text-sm text-gray-500">Ricevi notifiche per nuove offerte</span>
          <button
            onClick={handleToggleSubscription}
            disabled={togglingSubscription}
            title={subscribed ? 'Notifiche attive' : 'Attiva notifiche'}
            className="relative flex-shrink-0 w-6 h-6 transition-colors disabled:opacity-50"
          >
            {subscribed ? (
              <span className="flex items-center justify-center w-6 h-6 bg-forest text-white">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="flex items-center justify-center w-6 h-6 border-2 border-gray-400 hover:border-forest transition-colors" />
            )}
          </button>
        </div>
      </div>

      {/* ── Offerte ufficiali ── */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900">Offerte del Club</h2>
            <div className="w-6 h-px bg-forest mt-2" />
          </div>
          {isBoD && (
            <button
              onClick={() => setModal({ mode: 'add-official' })}
              className="flex items-center gap-1.5 bg-forest hover:bg-forest-deep text-white text-xs font-medium uppercase tracking-wide px-4 py-2 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Aggiungi offerta
            </button>
          )}
        </div>

        {officialOffers.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 border border-dashed border-gray-200 text-center">
            Nessuna offerta ufficiale al momento.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {officialOffers.map(offer => (
              <OfficialJobCard
                key={offer.id}
                offer={offer}
                canManage={isBoD}
                onEdit={() => setModal({ mode: 'edit', offer })}
                onDelete={() => setOfficial(prev => prev.filter(o => o.id !== offer.id))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Separator */}
      <div className="border-t border-gray-200 mb-12" />

      {/* ── Offerte segnalate ── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-gray-900">Segnalate dalla Community</h2>
            <div className="w-6 h-px bg-forest mt-2" />
          </div>
          <button
            onClick={() => setModal({ mode: 'add-member' })}
            className="flex items-center gap-1.5 border border-forest text-forest hover:bg-forest hover:text-white text-xs font-medium uppercase tracking-wide px-4 py-2 transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Segnala offerta
          </button>
        </div>

        {memberOffers.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 border border-dashed border-gray-200 text-center">
            Nessuna offerta segnalata dai membri al momento.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {memberOffers.map(offer => (
              <MemberJobCard
                key={offer.id}
                offer={offer}
                userId={userId}
                isBoD={isBoD}
                onDelete={() => setMember(prev => prev.filter(o => o.id !== offer.id))}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {modal && userId && (
        <JobModal
          mode={modal.mode}
          offer={modal.offer}
          userId={userId}
          onClose={() => setModal(null)}
          onSaved={handleJobSaved}
        />
      )}
    </div>
  )
}
