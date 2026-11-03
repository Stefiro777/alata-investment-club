'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Application = {
  id: string
  job_offer_id: string
  job_title: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  linkedin_url: string | null
  cover_letter: string | null
  cv_filename: string | null
  submitted_at: string
  status: string
  read_at: string | null
  archived: boolean
}

const STATUS_LABELS: Record<string, string> = {
  pending:  'In attesa',
  reviewed: 'Esaminata',
  accepted: 'Accettata',
  rejected: 'Rifiutata',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Applications received for the offers the current user created (bod/director
 * and the superadmin see all of them). Visibility is enforced by RLS on
 * job_applications (policy "Managers can read job applications"), so this
 * just reads the table: if the user manages nothing, the section stays hidden.
 */
export default function ReceivedApplications() {
  const [apps, setApps] = useState<Application[]>([])
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('job_applications')
      .select('id, job_offer_id, job_title, first_name, last_name, email, phone, linkedin_url, cover_letter, cv_filename, submitted_at, status, read_at, archived')
      .eq('archived', false)
      .order('submitted_at', { ascending: false })
      .then(({ data }) => {
        setApps((data ?? []) as Application[])
        setLoaded(true)
      })
  }, [])

  async function markRead(id: string) {
    const target = apps.find(a => a.id === id)
    if (!target || target.read_at) return
    const readAt = new Date().toISOString()
    const supabase = createClient()
    const { error } = await supabase.from('job_applications').update({ read_at: readAt }).eq('id', id)
    if (!error) setApps(prev => prev.map(a => a.id === id ? { ...a, read_at: readAt } : a))
  }

  async function setStatus(id: string, status: string) {
    const supabase = createClient()
    const { error } = await supabase.from('job_applications').update({ status }).eq('id', id)
    if (!error) setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  function toggle(id: string) {
    const next = expanded === id ? null : id
    setExpanded(next)
    if (next) void markRead(id)
  }

  if (!loaded || apps.length === 0) return null

  const unread = apps.filter(a => !a.read_at).length

  return (
    <section className="mb-12">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 border border-gray-200 bg-white px-5 py-4 text-left hover:border-forest transition-colors"
        aria-expanded={open}
      >
        <span className="font-serif text-xl font-bold text-gray-900">
          Candidature ricevute ({apps.length})
          {unread > 0 && (
            <span className="ml-3 align-middle inline-block bg-forest text-white text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5">
              {unread} {unread === 1 ? 'nuova' : 'nuove'}
            </span>
          )}
        </span>
        <svg
          className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border border-t-0 border-gray-200 bg-white divide-y divide-gray-100">
          {apps.map(a => {
            const isOpen = expanded === a.id
            return (
              <div key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" onClick={() => toggle(a.id)} className="flex-1 min-w-[200px] text-left">
                    <p className={`text-sm text-gray-900 ${a.read_at ? 'font-medium' : 'font-bold'}`}>
                      {!a.read_at && <span className="inline-block w-1.5 h-1.5 bg-forest mr-2 align-middle" aria-label="Non letta" />}
                      {a.first_name} {a.last_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.job_title} · {fmtDateTime(a.submitted_at)}</p>
                  </button>
                  <select
                    value={a.status}
                    onChange={e => setStatus(a.id, e.target.value)}
                    aria-label={`Stato candidatura di ${a.first_name} ${a.last_name}`}
                    className="text-xs font-medium uppercase tracking-wide border border-gray-200 px-2 py-1.5 bg-white focus:outline-none focus:border-forest"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {isOpen && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Email</p>
                      <a href={`mailto:${a.email}`} className="text-forest hover:underline break-all">{a.email}</a>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Telefono</p>
                      <p className="text-gray-900">{a.phone ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">LinkedIn</p>
                      {a.linkedin_url
                        ? <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline break-all">{a.linkedin_url}</a>
                        : <p className="text-gray-900">—</p>}
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">CV</p>
                      {a.cv_filename
                        // Signed, short-lived link generated server-side after an access check.
                        ? <a href={`/api/jobs/applications/${a.id}/cv`} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline break-all">{a.cv_filename}</a>
                        : <p className="text-gray-900">—</p>}
                    </div>
                    {a.cover_letter && (
                      <div className="sm:col-span-2">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Lettera di presentazione</p>
                        <p className="text-gray-900 whitespace-pre-wrap">{a.cover_letter}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
