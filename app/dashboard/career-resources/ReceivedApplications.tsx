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
    <section className="mt-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-y border-night/20 py-3.5 text-left transition-colors hover:bg-night/[0.03]"
      >
        <span className="font-serif text-[22px] font-medium leading-[1.1]">
          Candidature ricevute
          <span className="rd-eyebrow ml-3 align-middle text-[10px] text-earth-500">
            {apps.length}{unread > 0 ? ` · ${unread} ${unread === 1 ? 'nuova' : 'nuove'}` : ''}
          </span>
        </span>
        <span className="rd-italic text-[20px]">{open ? 'Close' : 'Open'}</span>
      </button>

      {open && (
        <div>
          {apps.map(a => {
            const isOpen = expanded === a.id
            return (
              <div key={a.id} className="border-b border-night/20 py-3.5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <button type="button" onClick={() => toggle(a.id)} aria-expanded={isOpen} className="min-w-[200px] flex-1 text-left">
                    <p className={`font-serif text-[20px] leading-[1.15] ${a.read_at ? 'font-medium' : 'font-semibold'}`}>
                      {!a.read_at && <span className="mr-2 inline-block h-1.5 w-1.5 bg-club align-middle" aria-label="Non letta" />}
                      {a.first_name} {a.last_name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-earth-600">{a.job_title} · {fmtDateTime(a.submitted_at)}</p>
                  </button>
                  <select
                    value={a.status}
                    onChange={e => setStatus(a.id, e.target.value)}
                    aria-label={`Stato candidatura di ${a.first_name} ${a.last_name}`}
                    className="rd-eyebrow border-b border-night bg-transparent px-1 py-1.5 text-[10px] focus:outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>

                {isOpen && (
                  <div className="mt-4 grid gap-x-8 gap-y-3 text-[13px] sm:grid-cols-2">
                    <div>
                      <p className="rd-eyebrow mb-0.5 text-[10px] text-earth-500">Email</p>
                      <a href={`mailto:${a.email}`} className="break-all text-club hover:underline">{a.email}</a>
                    </div>
                    <div>
                      <p className="rd-eyebrow mb-0.5 text-[10px] text-earth-500">Telefono</p>
                      <p>{a.phone ?? '—'}</p>
                    </div>
                    <div>
                      <p className="rd-eyebrow mb-0.5 text-[10px] text-earth-500">LinkedIn</p>
                      {a.linkedin_url
                        ? <a href={a.linkedin_url} target="_blank" rel="noopener noreferrer" className="break-all text-club hover:underline">{a.linkedin_url}</a>
                        : <p>—</p>}
                    </div>
                    <div>
                      <p className="rd-eyebrow mb-0.5 text-[10px] text-earth-500">CV</p>
                      {a.cv_filename
                        // Signed, short-lived link generated server-side after an access check.
                        ? <a href={`/api/jobs/applications/${a.id}/cv`} target="_blank" rel="noopener noreferrer" className="break-all text-club hover:underline">{a.cv_filename}</a>
                        : <p>—</p>}
                    </div>
                    {a.cover_letter && (
                      <div className="sm:col-span-2">
                        <p className="rd-eyebrow mb-0.5 text-[10px] text-earth-500">Lettera di presentazione</p>
                        <p className="whitespace-pre-wrap">{a.cover_letter}</p>
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
