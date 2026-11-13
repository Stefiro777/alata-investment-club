'use client'

import { PageTitle, Section, Pill } from '@/app/components/member/ui'
import { MentorStrip, JobResources } from './JobsExtras'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '../DashboardProfileContext'
import ReceivedApplications from './ReceivedApplications'

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
  application_email?: string | null
}

type ModalState = {
  mode: 'add-official' | 'add-member' | 'edit'
  offer?: JobOffer
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── JobModal ──────────────────────────────────────────────────────────────────

function JobModal({
  mode,
  offer,
  userId,
  userEmail,
  onClose,
  onSaved,
}: {
  mode: 'add-official' | 'add-member' | 'edit'
  offer?: JobOffer
  userId: string
  userEmail: string
  onClose: () => void
  onSaved: (job: JobOffer, isNew: boolean) => void
}) {
  const [title, setTitle]         = useState(offer?.title ?? '')
  const [company, setCompany]     = useState(offer?.company ?? '')
  const [link, setLink]           = useState(offer?.link ?? '')
  const [description, setDesc]    = useState(offer?.description ?? '')
  const [applyMode, setApplyMode] = useState<'link' | 'form'>(offer?.apply_mode ?? 'link')
  const [applicationEmail, setApplicationEmail] = useState(offer?.application_email ?? userEmail)
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicationEmail.trim())) {
      setError('Inserisci un\'email valida per le candidature.')
      return
    }
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
          application_email: applicationEmail.trim(),
        })
        .eq('id', offer.id)
      if (err) { setError(err.message); setSaving(false); return }
      onSaved({ ...offer, title: title.trim(), company: company.trim(), link: link.trim(), description: description || null, apply_mode: applyMode, application_email: applicationEmail.trim() }, false)
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
          application_email: applicationEmail.trim(),
        })
        .select('id, title, company, link, description, type, created_by, created_at, apply_mode, application_email')
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
                  className={`flex-1 px-3 py-2.5 text-sm transition-colors ${applyMode === 'link' ? 'bg-club text-ivory' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  Link esterno
                </button>
                <button
                  type="button"
                  onClick={() => setApplyMode('form')}
                  className={`flex-1 px-3 py-2.5 text-sm border-l border-gray-200 transition-colors ${applyMode === 'form' ? 'bg-club text-ivory' : 'text-gray-600 hover:bg-gray-50'}`}
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
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email per le candidature *</label>
            <input
              required
              type="email"
              value={applicationEmail}
              onChange={e => setApplicationEmail(e.target.value)}
              placeholder="nome@esempio.it"
              className="w-full px-3 py-2.5 border border-gray-200 focus:outline-none focus:border-forest text-sm" />
            <p className="text-xs text-gray-400 mt-1">Qui arriva una notifica a ogni nuova candidatura ricevuta tramite il form interno.</p>
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
            className="bg-club hover:bg-moss text-ivory text-sm font-medium px-5 py-2 transition-colors disabled:opacity-50">
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

    // Store the storage PATH, not a public URL: CVs are served via signed URLs
    // generated server-side (see lib/cv-path.ts).
    const cvUrl = path

    // Insert application
    // The id is generated here: the applicant has no SELECT policy on
    // job_applications, so .select() after the insert cannot return it.
    const applicationId = crypto.randomUUID()
    const { error: insertErr } = await supabase.from('job_applications').insert({
      id: applicationId,
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

    // Fire-and-forget: notifies the offer's application email (server-side).
    fetch('/api/jobs/applications/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId }),
    }).catch(() => {})

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
                className="w-full bg-club text-ivory py-3 text-sm font-semibold uppercase tracking-widest hover:bg-moss transition-colors rounded-none mt-6 disabled:opacity-50"
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

// ── JobRow ────────────────────────────────────────────────────────────────────

const textAction = 'rd-italic text-[22px] hover:underline underline-offset-[0.18em]'
const dangerAction = 'rd-italic text-[22px] text-[#8a2a1d] hover:underline underline-offset-[0.18em] disabled:opacity-50'

/**
 * One offer as a row: title and company, and (for the Board) how many people
 * applied through the form. Opening it shows the description and the actions
 * inline, no page of its own.
 */
function JobRow({
  offer,
  applicants,
  canEdit,
  canDelete,
  byline,
  onEdit,
  onDelete,
}: {
  offer: JobOffer
  /** Applications received through the form; null when the viewer is not on the Board. */
  applicants: number | null
  canEdit: boolean
  canDelete: boolean
  byline?: string
  onEdit?: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAppModal, setShowAppModal] = useState(false)
  const isFormMode = offer.apply_mode === 'form'

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('job_offers').delete().eq('id', offer.id)
    onDelete()
  }

  return (
    <div className="border-b border-night/20">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-3.5 text-left transition-colors hover:bg-night/[0.03]"
      >
        <div className="min-w-0">
          <div className="font-serif text-[22px] font-medium leading-[1.1]">{offer.title}</div>
          <div className="mt-[3px] text-[12px] leading-[1.5] text-earth-600">{offer.company}</div>
        </div>
        <span className="flex items-baseline gap-5">
          {isFormMode && applicants !== null && (
            <span className="rd-eyebrow text-[10px] text-earth-500">{applicants} {applicants === 1 ? 'candidate' : 'candidates'}</span>
          )}
          <span className="rd-italic text-[20px]">{open ? 'Close' : 'Details'}</span>
        </span>
      </button>

      {open && (
        <div className="pb-5">
          {offer.description
            ? <p className="max-w-[640px] whitespace-pre-wrap text-[13px] leading-[1.6] text-earth-700">{offer.description}</p>
            : <p className="text-[13px] text-earth-600">No description.</p>}
          <div className="rd-eyebrow mt-3 text-[10px] text-earth-500">
            {[byline, fmtDate(offer.created_at)].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {isFormMode ? (
              <button type="button" onClick={() => setShowAppModal(true)} className={`${textAction} text-club`}>Apply</button>
            ) : (
              <a href={offer.link} target="_blank" rel="noopener noreferrer" className={`${textAction} text-club`}>View offer</a>
            )}
            {canEdit && onEdit && <button type="button" onClick={onEdit} className={textAction}>Edit</button>}
            {canDelete && (confirmDelete ? (
              <span className="flex flex-wrap items-baseline gap-x-5">
                <span className="text-[13px]">Delete this offer?</span>
                <button type="button" onClick={handleDelete} disabled={deleting} className={dangerAction}>Yes, delete</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className={textAction}>No</button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className={dangerAction}>Delete</button>
            ))}
          </div>
        </div>
      )}

      {showAppModal && <JobApplicationModal job={offer} onClose={() => setShowAppModal(false)} />}
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


  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: official }, { data: member }, { data: sub }] = await Promise.all([
      supabase.from('job_offers').select('id, title, company, link, description, type, created_by, created_at, apply_mode, application_email')
        .eq('type', 'official').order('created_at', { ascending: false }),
      supabase.from('job_offers').select('id, title, company, link, description, type, created_by, created_at, apply_mode, application_email')
        .eq('type', 'member').order('created_at', { ascending: false }),
      supabase.from('job_offer_subscriptions').select('id, subscribed').eq('user_id', user.id).maybeSingle(),
    ])

    // Resolve creator names for member offers
    const memberList = (member ?? []) as JobOffer[]
    const creatorIds = [...new Set(memberList.map(o => o.created_by).filter(Boolean))] as string[]
    const creatorMap: Record<string, string> = {}
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

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount: state is set after the request resolves
  useEffect(() => { loadData() }, [])

  // How many people applied through the form, per offer: the Board only (RLS lets managers read job_applications).
  const [applicantCounts, setApplicantCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    if (!isBoD) return
    createClient()
      .from('job_applications')
      .select('job_offer_id')
      .eq("archived", false)
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const r of (data ?? []) as { job_offer_id: string }[]) counts[r.job_offer_id] = (counts[r.job_offer_id] ?? 0) + 1
        setApplicantCounts(counts)
      })
  }, [isBoD])

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
      <p className="py-12 text-[13px] text-earth-600">Loading…</p>
    )
  }

  return (
    <div>
      <PageTitle title={<>Career <em>Resources</em></>} sub="Open positions, mentors and every resource the club keeps for your applications." />
      <MentorStrip />

      <Section title="Job offers" meta={`${officialOffers.length + memberOffers.length} open`}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          {isBoD && <Pill solid onClick={() => setModal({ mode: 'add-official' })}>Add offer</Pill>}
          <Pill onClick={() => setModal({ mode: 'add-member' })}>Suggest an offer</Pill>
          <span className="grow" />
          <Pill active={subscribed} disabled={togglingSubscription} onClick={handleToggleSubscription}>
            {subscribed ? 'New offers: notifications on' : 'Notify me of new offers'}
          </Pill>
        </div>

        <ReceivedApplications />

        <div className="rd-eyebrow mt-8 text-[10px] text-earth-500">From the club</div>
        <div className="mt-2 border-t border-night/20">
          {officialOffers.length === 0 ? (
            <p className="py-5 text-[13px] text-earth-600">No offers from the club right now.</p>
          ) : officialOffers.map(offer => (
            <JobRow
              key={offer.id}
              offer={offer}
              applicants={isBoD ? (applicantCounts[offer.id] ?? 0) : null}
              canEdit={isBoD}
              canDelete={isBoD}
              onEdit={() => setModal({ mode: 'edit', offer })}
              onDelete={() => setOfficial(prev => prev.filter(o => o.id !== offer.id))}
            />
          ))}
        </div>

        <div className="rd-eyebrow mt-10 text-[10px] text-earth-500">Suggested by members</div>
        <div className="mt-2 border-t border-night/20">
          {memberOffers.length === 0 ? (
            <p className="py-5 text-[13px] text-earth-600">No offers suggested by members yet.</p>
          ) : memberOffers.map(offer => (
            <JobRow
              key={offer.id}
              offer={offer}
              applicants={isBoD ? (applicantCounts[offer.id] ?? 0) : null}
              canEdit={false}
              canDelete={isBoD || offer.created_by === userId}
              byline={offer.creator_name ? `Suggested by ${offer.creator_name}` : undefined}
              onDelete={() => setMember(prev => prev.filter(o => o.id !== offer.id))}
            />
          ))}
        </div>
      </Section>

      <JobResources displayName={profile?.full_name ?? 'Member'} />

      {/* Modal */}
      {modal && userId && (
        <JobModal
          mode={modal.mode}
          offer={modal.offer}
          userId={userId}
          userEmail={profile?.email ?? ''}
          onClose={() => setModal(null)}
          onSaved={handleJobSaved}
        />
      )}
    </div>
  )
}
