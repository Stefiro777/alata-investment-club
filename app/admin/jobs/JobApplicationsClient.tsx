'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { JobApplication } from './page'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

const STATUS_LABELS: Record<string, string> = {
  pending:  'In attesa',
  reviewed: 'Esaminata',
  accepted: 'Accettata',
  rejected: 'Rifiutata',
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  reviewed: 'bg-blue-100 text-blue-800',
  accepted: 'bg-[#1a4a3a] text-white',
  rejected: 'bg-red-100 text-red-800',
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl font-bold text-ink-900">{title}</h1>
      <div className="w-8 h-0.5 bg-forest mt-2" />
      {subtitle && <p className="text-sm text-ink-500 mt-3">{subtitle}</p>}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArchiveIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M5 8h14M5 8a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v0a2 2 0 01-2 2M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8M10 12h4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  )
}

// ── Cover Letter Modal ────────────────────────────────────────────────────────

function CoverLetterModal({ text, applicant, onClose }: { text: string; applicant: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-2xl max-h-[80vh] overflow-y-auto border-t-4 border-[#1a4a3a] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black text-xl leading-none hover:opacity-60 transition-opacity"
          aria-label="Chiudi"
        >
          ✕
        </button>
        <div className="px-8 pt-8 pb-4">
          <h2 className="font-serif text-xl font-bold text-black">Lettera di presentazione</h2>
          <p className="text-sm text-gray-500 mt-1">{applicant}</p>
        </div>
        <div className="px-8 pb-8">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </div>
    </div>
  )
}

// ── Action buttons ────────────────────────────────────────────────────────────

const actionBtn = 'border border-black p-1.5 hover:bg-black hover:text-white transition-colors text-black flex-shrink-0'

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onConfirm}
          className="text-xs border border-red-500 text-red-600 px-2 py-1 hover:bg-red-600 hover:text-white transition-colors"
        >
          Conferma
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs border border-black px-2 py-1 hover:bg-black hover:text-white transition-colors"
        >
          Annulla
        </button>
      </span>
    )
  }

  return (
    <button title="Elimina" className={actionBtn} onClick={() => setConfirming(true)}>
      <TrashIcon />
    </button>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────

const COLS = ['Data', 'Nome e Cognome', 'Email', 'Posizione', 'Telefono', 'LinkedIn', 'CV', 'Lettera', 'Stato', 'Azioni']
const COLS_ARCHIVED = ['Data', 'Nome e Cognome', 'Email', 'Posizione', 'Telefono', 'LinkedIn', 'CV', 'Lettera', 'Stato', 'Azioni']

function AppTable({
  rows,
  muted,
  onStatusChange,
  onArchive,
  onRestore,
  onDelete,
  onReadLetter,
}: {
  rows: JobApplication[]
  muted?: boolean
  onStatusChange?: (id: string, status: string) => void
  onArchive?: (id: string) => void
  onRestore?: (id: string) => void
  onDelete: (id: string) => void
  onReadLetter: (text: string, applicant: string) => void
}) {
  const tdCls = muted ? 'px-4 py-3 whitespace-nowrap text-gray-400 text-xs' : 'px-4 py-3 whitespace-nowrap text-ink-500 text-xs'

  return (
    <div className={`border overflow-x-auto ${muted ? 'border-gray-200 bg-gray-50' : 'border-line-faint bg-white'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10">
            {(muted ? COLS_ARCHIVED : COLS).map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(app => {
            const name = `${app.first_name} ${app.last_name}`
            return (
              <tr key={app.id} className={`border-b border-black/5 last:border-b-0 transition-colors ${muted ? 'hover:bg-gray-100' : 'hover:bg-black/[0.015]'}`}>
                <td className={tdCls}>{fmtDateTime(app.submitted_at)}</td>
                <td className={`px-4 py-3 whitespace-nowrap font-medium ${muted ? 'text-gray-400' : 'text-ink-900'}`}>
                  {name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <a href={`mailto:${app.email}`} className={`hover:underline underline-offset-2 ${muted ? 'text-gray-400' : 'text-forest'}`}>
                    {app.email}
                  </a>
                </td>
                <td className={`px-4 py-3 max-w-[180px] truncate ${muted ? 'text-gray-400' : 'text-ink-700'}`}>
                  {app.job_title}
                </td>
                <td className={`px-4 py-3 whitespace-nowrap ${muted ? 'text-gray-400' : 'text-ink-500'}`}>
                  {app.phone ?? '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {app.linkedin_url ? (
                    <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className={`hover:underline underline-offset-2 text-xs ${muted ? 'text-gray-400' : 'text-forest'}`}>
                      LinkedIn ↗
                    </a>
                  ) : <span className={muted ? 'text-gray-400' : ''}>—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {app.cv_url ? (
                    <a href={app.cv_url} target="_blank" rel="noopener noreferrer"
                      className={`inline-block text-xs font-medium uppercase tracking-wide px-3 py-1 transition-colors border ${muted ? 'border-gray-300 text-gray-400 hover:bg-gray-300 hover:text-white' : 'border-forest text-forest hover:bg-forest hover:text-white'}`}>
                      Scarica CV
                    </a>
                  ) : <span className={muted ? 'text-gray-400' : ''}>—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {app.cover_letter ? (
                    <button
                      onClick={() => onReadLetter(app.cover_letter!, name)}
                      className={`inline-block text-xs font-medium uppercase tracking-wide px-3 py-1 transition-colors border ${muted ? 'border-gray-300 text-gray-400 hover:border-gray-400' : 'border-gray-300 text-ink-600 hover:border-forest hover:text-forest'}`}
                    >
                      Leggi
                    </button>
                  ) : <span className={muted ? 'text-gray-400' : ''}>—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 ${muted ? 'bg-gray-100 text-gray-400' : (STATUS_COLORS[app.status] ?? 'bg-gray-100 text-gray-600')}`}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {!muted && onStatusChange && (
                      <select
                        value={app.status}
                        onChange={e => onStatusChange(app.id, e.target.value)}
                        className="px-2 py-1 border border-line focus:outline-none focus:border-forest text-xs text-ink-900 bg-white"
                      >
                        {Object.entries(STATUS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                    )}
                    {!muted && onArchive && (
                      <button title="Archivia" className={actionBtn} onClick={() => onArchive(app.id)}>
                        <ArchiveIcon />
                      </button>
                    )}
                    {muted && onRestore && (
                      <button
                        title="Ripristina"
                        className="border border-black px-2 py-1 text-xs hover:bg-black hover:text-white transition-colors flex items-center gap-1"
                        onClick={() => onRestore(app.id)}
                      >
                        <RestoreIcon />
                        Ripristina
                      </button>
                    )}
                    <DeleteButton onConfirm={() => onDelete(app.id)} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JobApplicationsClient({ applications: initial }: { applications: JobApplication[] }) {
  const [applications, setApplications] = useState<JobApplication[]>(initial)
  const [filterTitle, setFilterTitle]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [archiveOpen, setArchiveOpen]   = useState(false)
  const [coverLetter, setCoverLetter]   = useState<{ text: string; applicant: string } | null>(null)

  const active   = applications.filter(a => !a.archived)
  const archived = applications.filter(a => a.archived)

  const uniqueTitles = [...new Set(initial.map(a => a.job_title))].sort()

  const filteredActive = active.filter(a => {
    const matchTitle  = !filterTitle  || a.job_title === filterTitle
    const matchStatus = !filterStatus || a.status === filterStatus
    return matchTitle && matchStatus
  })

  async function handleStatusChange(id: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase.from('job_applications').update({ status: newStatus }).eq('id', id)
    if (!error) setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
  }

  async function handleArchive(id: string) {
    const res = await fetch('/api/admin/archive-job-application', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, archived: true }),
    })
    if (res.ok) setApplications(prev => prev.map(a => a.id === id ? { ...a, archived: true } : a))
  }

  async function handleRestore(id: string) {
    const res = await fetch('/api/admin/archive-job-application', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, archived: false }),
    })
    if (res.ok) setApplications(prev => prev.map(a => a.id === id ? { ...a, archived: false } : a))
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/admin/delete-job-application', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setApplications(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <SectionHeading
        title="Candidature"
        subtitle={`${active.length} candidatur${active.length === 1 ? 'a' : 'e'} attiv${active.length === 1 ? 'a' : 'e'}`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterTitle}
          onChange={e => setFilterTitle(e.target.value)}
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white min-w-[200px]"
        >
          <option value="">Tutte le posizioni</option>
          {uniqueTitles.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-line focus:outline-none focus:border-forest text-sm text-ink-900 bg-white min-w-[160px]"
        >
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {(filterTitle || filterStatus) && (
          <button
            onClick={() => { setFilterTitle(''); setFilterStatus('') }}
            className="px-3 py-2 border border-line text-sm text-ink-500 hover:border-forest hover:text-forest transition-colors"
          >
            Rimuovi filtri
          </button>
        )}
      </div>

      {/* Active table */}
      {filteredActive.length === 0 ? (
        <div className="bg-white border border-line-faint px-8 py-16 text-center">
          <p className="text-sm text-ink-500">Nessuna candidatura trovata.</p>
        </div>
      ) : (
        <AppTable
          rows={filteredActive}
          onStatusChange={handleStatusChange}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onReadLetter={(text, applicant) => setCoverLetter({ text, applicant })}
        />
      )}

      {/* Archived section */}
      <div className="mt-10">
        <button
          onClick={() => setArchiveOpen(v => !v)}
          className="w-full bg-gray-100 border border-black px-4 py-3 text-sm font-semibold uppercase tracking-widest text-left flex items-center justify-between hover:bg-gray-200 transition-colors"
        >
          <span>Archivio ({archived.length})</span>
          <svg
            className="w-4 h-4 transition-transform duration-200"
            style={{ transform: archiveOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {archiveOpen && (
          <div className="mt-2">
            {archived.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 px-8 py-10 text-center">
                <p className="text-sm text-gray-400">Nessuna candidatura archiviata.</p>
              </div>
            ) : (
              <AppTable
                rows={archived}
                muted
                onRestore={handleRestore}
                onDelete={handleDelete}
                onReadLetter={(text, applicant) => setCoverLetter({ text, applicant })}
              />
            )}
          </div>
        )}
      </div>

      {coverLetter && (
        <CoverLetterModal
          text={coverLetter.text}
          applicant={coverLetter.applicant}
          onClose={() => setCoverLetter(null)}
        />
      )}
    </div>
  )
}
